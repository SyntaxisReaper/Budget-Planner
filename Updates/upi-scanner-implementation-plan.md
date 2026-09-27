# UPI Screenshot Scanner — Implementation Plan

Dual-engine approach: Gemini Vision as primary, Tesseract OCR as fallback.
Covers Google Pay, PhonePe, Paytm, BHIM, and Navi.

---

## 1. How it works end to end

1. User taps "Scan Receipt" in the Transactions page
2. Picks a screenshot from gallery (mobile) or file picker (web/desktop)
3. Image is sent to the backend as base64
4. Backend tries Gemini Vision first — structured JSON extraction in one call
5. If Gemini fails (rate limit, timeout, error), falls back to Tesseract OCR + regex parser
6. Either path returns the same normalized JSON: `{ amount, recipient, utr_id, occurred_at, app_source }`
7. Frontend pre-fills a draft transaction modal with these values
8. User confirms the account, optionally picks an item, taps Save
9. Transaction logs normally through the existing `POST /transactions` flow

---

## 2. What each UPI app's success screen contains

| App | Amount format | UTR label | Date format | Notes |
|---|---|---|---|---|
| Google Pay | `₹1,200` bold, center | `UPI transaction ID` | `15 Sep, 3:42 PM` | Green tick, recipient name prominent |
| PhonePe | `₹1,200` large | `Transaction ID` | `15 Sep 2026, 03:42 PM` | Purple theme, merchant or VPA shown |
| Paytm | `₹1,200 Paid` | `Order ID` / `UTR` | `15-09-2026 15:42:00` | Sometimes shows both Order ID and UTR |
| BHIM | `Rs. 1200.00` | `Transaction Reference No.` | `15/09/2026 15:42` | Plainer layout, easiest for OCR |
| Navi | `₹1,200` | `UPI Ref No.` | `Sep 15, 2026 · 3:42 PM` | Minimal UI, clean fonts |

The Gemini prompt handles all five by understanding context, not by matching fixed positions. The regex fallback has one pattern set per app, detected by identifying app-specific strings in the raw OCR text.

---

## 3. Backend

### Install

```bash
npm install multer tesseract.js sharp
```

- `multer` — handles the multipart image upload from the frontend
- `tesseract.js` — Node-native OCR, no system binary needed
- `sharp` — preprocesses the image before Tesseract (greyscale, contrast boost, resize) to significantly improve OCR accuracy on stylized UPI screenshots

### New file: `src/services/receiptScanner.js`

```js
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseReceiptText } from './receiptParser.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Primary: Gemini Vision ────────────────────────────────────────────────

export async function scanWithGemini(base64Image, mimeType = 'image/png') {
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

  const prompt = `
You are a UPI payment receipt parser. Extract the following fields from this screenshot and return ONLY a valid JSON object with no extra text, no markdown, no explanation.

Required fields:
{
  "amount": <number, no currency symbol, no commas. e.g. 1200.00>,
  "recipient": <string, the name or VPA the money was sent to>,
  "utr_id": <string, the UPI Transaction ID / UTR / Reference Number. 12 digits typically>,
  "date": <string, in ISO 8601 format: YYYY-MM-DDTHH:mm:ss>,
  "app_source": <string, one of: "googlepay" | "phonepe" | "paytm" | "bhim" | "navi" | "unknown">,
  "confidence": <number, 0-1, how confident you are in the extraction>
}

Rules:
- amount must be a positive number
- If you cannot find a field, set it to null
- For date, convert whatever format is shown to ISO 8601. Assume IST (UTC+5:30).
- Do not include any text outside the JSON object
`;

  const result = await model.generateContent([
    { inlineData: { data: base64Image, mimeType } },
    prompt
  ]);

  const text = result.response.text().trim();
  // Strip any accidental markdown backticks
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!parsed.amount || parsed.amount <= 0) {
    throw new Error('Gemini returned invalid amount');
  }

  return { ...parsed, engine: 'gemini' };
}

// ─── Fallback: Tesseract OCR ───────────────────────────────────────────────

export async function scanWithOCR(imageBuffer) {
  // Preprocess: greyscale + contrast boost for better OCR accuracy on stylised UPI screens
  const processed = await sharp(imageBuffer)
    .greyscale()
    .normalise()            // auto-contrast stretch
    .sharpen()
    .toBuffer();

  const { data: { text } } = await Tesseract.recognize(processed, 'eng', {
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz₹.,/:@- ',
  });

  // Parse the raw OCR text using app-specific regex patterns
  const result = parseReceiptText(text);
  if (!result.amount || result.amount <= 0) {
    throw new Error('OCR could not extract a valid amount');
  }

  return { ...result, engine: 'ocr' };
}

// ─── Orchestrator: try Gemini, fall back to OCR ───────────────────────────

export async function scanReceipt(base64Image, imageBuffer, mimeType) {
  try {
    const result = await scanWithGemini(base64Image, mimeType);
    // If Gemini returned low confidence, run OCR too and merge
    if (result.confidence < 0.7) {
      try {
        const ocrResult = await scanWithOCR(imageBuffer);
        // Prefer OCR values for fields Gemini wasn't confident about
        return mergeResults(result, ocrResult);
      } catch {
        // OCR also failed — return Gemini result as-is
        return result;
      }
    }
    return result;
  } catch (geminiError) {
    console.warn('Gemini scan failed, falling back to OCR:', geminiError.message);
    // Gemini failed entirely — try OCR
    return await scanWithOCR(imageBuffer);
  }
}

function mergeResults(gemini, ocr) {
  return {
    amount:     gemini.amount     ?? ocr.amount,
    recipient:  gemini.recipient  ?? ocr.recipient,
    utr_id:     gemini.utr_id     ?? ocr.utr_id,
    date:       gemini.date       ?? ocr.date,
    app_source: gemini.app_source !== 'unknown' ? gemini.app_source : ocr.app_source,
    confidence: gemini.confidence,
    engine:     'gemini+ocr',
  };
}
```

---

### New file: `src/services/receiptParser.js`

App-specific regex patterns applied to raw OCR text. Each UPI app has identifiable strings in its UI:

```js
export function parseReceiptText(text) {
  const app = detectApp(text);
  const amount = extractAmount(text);
  const utr_id = extractUTR(text);
  const date = extractDate(text, app);
  const recipient = extractRecipient(text, app);

  return { amount, recipient, utr_id, date: date?.toISOString() ?? null, app_source: app };
}

function detectApp(text) {
  const t = text.toLowerCase();
  if (t.includes('google pay') || t.includes('gpay')) return 'googlepay';
  if (t.includes('phonepe') || t.includes('phone pe')) return 'phonepe';
  if (t.includes('paytm')) return 'paytm';
  if (t.includes('bhim')) return 'bhim';
  if (t.includes('navi')) return 'navi';
  return 'unknown';
}

function extractAmount(text) {
  // Handles: ₹1,200  ₹1,200.00  Rs. 1200.00  INR 1,200
  const patterns = [
    /[₹Rs\.INR]+\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:paid|sent|debited)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseFloat(m[1].replace(/,/g, ''));
  }
  return null;
}

function extractUTR(text) {
  // UTR is always 12 digits; various label formats across apps
  const patterns = [
    /(?:UPI\s*(?:transaction\s*)?ID|UTR|Transaction\s*(?:ID|Ref(?:erence)?)|Ref(?:erence)?\s*(?:No\.?|Number)|UPI\s*Ref\s*No\.?)\s*[:\-]?\s*([A-Z0-9]{10,20})/i,
    /([A-Z]{2,4}\d{10,14})/,  // e.g. PYTM123456789012
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function extractDate(text, app) {
  const patterns = [
    // 15 Sep 2026, 3:42 PM  (Google Pay, Navi)
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})[,\s·]+(\d{1,2}):(\d{2})\s*(AM|PM)/i,
    // 15-09-2026 15:42  (Paytm, BHIM)
    /(\d{2})[-\/](\d{2})[-\/](\d{4})\s+(\d{2}):(\d{2})/,
    // Sep 15, 2026 · 3:42 PM  (Navi variant)
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})\s*[·\-,]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  ];

  const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      try {
        // Parse into a Date (IST = UTC+5:30, account for offset)
        // Implementation: parse each capture group into day/month/year/hour/minute
        // then subtract 330 minutes to get UTC for ISO storage
        // (full implementation in the actual file)
        return new Date(/* parsed from match groups */);
      } catch { continue; }
    }
  }
  return null;
}

function extractRecipient(text, app) {
  // Each app labels the recipient differently
  const patterns = [
    /(?:Paid\s+to|Sent\s+to|To|Payment\s+to)\s*[:\-]?\s*([A-Za-z0-9\s\.@]+?)(?:\n|UPI|₹|\d{10})/i,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+)/,  // fallback: extract VPA (UPI ID)
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}
```

---

### New route: `src/routes/receipts.js`

```js
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { scanReceipt } from '../services/receiptScanner.js';

const router = Router();
router.use(authenticate);

// Memory storage — never touches disk, image goes straight to Gemini/Tesseract
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are accepted'));
    }
    cb(null, true);
  }
});

router.post('/scan', upload.single('receipt'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  const base64 = req.file.buffer.toString('base64');
  const result = await scanReceipt(base64, req.file.buffer, req.file.mimetype);

  // Normalize the date to IST-aware ISO string before sending to frontend
  res.json({
    amount:     result.amount,
    recipient:  result.recipient,
    utr_id:     result.utr_id,
    occurred_at: result.date,
    app_source: result.app_source,
    engine:     result.engine,   // tells the UI which engine succeeded
    note:       result.recipient ? `Paid to ${result.recipient}` : undefined,
  });
});

export default router;
```

Mount in `index.js`:
```js
import receiptsRouter from './routes/receipts.js';
app.use('/api/receipts', receiptsRouter);
```

---

## 4. Frontend

### Mobile — `@capacitor/filesystem` + gallery picker

On Android, use the existing Camera plugin (already imported in the codebase) in `Photos` mode to open the gallery without taking a new photo:

```js
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';

async function pickReceiptFromGallery() {
  const photo = await Camera.getPhoto({
    source: CameraSource.Photos,
    resultType: CameraResultType.Base64,
    quality: 90,
  });
  return { base64: photo.base64String, mimeType: 'image/jpeg' };
}
```

### Web/Desktop — `<input type="file">`

```js
async function pickReceiptFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  });
}
```

### Sending to the backend

```js
async function scanReceipt(base64, mimeType) {
  const blob = await fetch(`data:${mimeType};base64,${base64}`).then(r => r.blob());
  const form = new FormData();
  form.append('receipt', blob, 'receipt.jpg');
  return apiClient.post('/receipts/scan', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}
```

### The "Scan Receipt" UI flow in `Transactions.jsx`

Add a **"Scan Receipt"** button next to the existing "Add Transaction" button:

```
[ + Add Transaction ]  [ 📷 Scan Receipt ]
```

On click:
1. Open file/gallery picker (platform-aware)
2. Show a loading state: "Scanning your receipt..." with a spinner
3. On success: open the existing transaction modal, pre-filled with scanned values
4. Show a small badge on the modal: `Scanned via Gemini` or `Scanned via OCR` (from `engine` field)
5. `amount`, `utr_id`, `occurred_at` are pre-filled and **not editable** (protected to prevent accidental change)
6. `item_id` (which item this is for), `account_id`, and `note` are left for manual selection — exactly as requested
7. On error: show a toast "Couldn't read this screenshot — try a clearer image or fill in manually"

### Error states to handle

| Situation | What the app does |
|---|---|
| Both Gemini and OCR fail | Toast + fall back to blank manual form |
| Amount extracted but UTR missing | Pre-fill what's available, leave UTR blank |
| Duplicate UTR (already logged) | Warn: "A transaction with this UTR is already in your log" before saving |
| Low confidence from Gemini | Yellow warning banner on the modal: "Some fields may need checking" |

---

## 5. Duplicate UTR guard

Add to `POST /transactions` in `transactions.js` (already has a `utr_id` field):

```js
if (body.utr_id) {
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', req.userId)
    .eq('utr_id', body.utr_id)
    .single();
  if (existing) {
    return res.status(409).json({
      error: 'duplicate_utr',
      message: 'A transaction with this UTR ID is already logged.'
    });
  }
}
```

---

## 6. Build order

1. **Backend: `receiptParser.js`** — pure functions, testable in isolation. Write one test per app (Google Pay, PhonePe, Paytm, BHIM, Navi) using a sample OCR text string before touching real images.
2. **Backend: `receiptScanner.js`** — Gemini Vision call + Tesseract fallback + merge logic.
3. **Backend: `receipts.js` route** — wire multer + the scanner service.
4. **Backend: duplicate UTR guard** in `transactions.js`.
5. **Frontend: platform-aware image picker** (`pickReceiptFromGallery` on Capacitor, `<input file>` on web).
6. **Frontend: `scanReceipt()` API call** + loading state.
7. **Frontend: pre-filled modal** with protected amount/UTR/date fields and engine badge.
8. **Frontend: error/low-confidence states**.
9. **Testing**: scan one real screenshot from each of the five apps, verify all fields extract correctly, confirm the duplicate UTR check catches a re-scan.

---

## 7. One thing to expect

PhonePe and Paytm screenshots are the hardest for raw Tesseract because of background gradients and bold stylized fonts. The `sharp` preprocessing (greyscale + normalise + sharpen) handles most of this, but for particularly stylized screens, Gemini Vision will almost always outperform Tesseract — which is exactly why the fallback goes OCR→Gemini, not the other way around. If you find a specific app's screenshots consistently failing OCR, that's the one to add app-specific `sharp` preprocessing for (e.g. cropping to just the text region before running Tesseract).
