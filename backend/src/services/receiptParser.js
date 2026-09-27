/**
 * receiptParser.js
 * Pure regex-based parser for UPI payment receipt OCR text.
 * No dependencies. Fully testable in isolation.
 *
 * Supported apps: Google Pay, PhonePe, Paytm, BHIM, Navi
 *
 * Patterns validated against real Tesseract OCR output from actual screenshots.
 * Key learnings from real images:
 *  - Amount: ₹ symbol often missing from OCR of large display fonts.
 *            Paytm writes "Rupees Thirty Only" in text form.
 *            Need word-form number parsing for Paytm.
 *  - BHIM: App name only appears in the top header which OCR may crop.
 *           "Banking Name" label is BHIM-unique fallback.
 *  - PhonePe: Has two IDs — "PhonePe Transaction ID" (internal) and "UTR:" (bank ref).
 *             Must prefer UTR: label.
 *  - Navi: VPA contains "paytm-blinkit@ptybl" which would trigger Paytm detection.
 *          Must check for "Navi" app name OR "Navi transaction ID" label first.
 *  - Recipient: OCR layout joins labels with recipient name; need tighter stop words.
 */

// ─── Main Entry Point ────────────────────────────────────────────────────────

export function parseReceiptText(text) {
  const app = detectApp(text);
  const amount = extractAmount(text);
  const utr_id = extractUTR(text, app);
  const date = extractDate(text, app);
  const recipient = extractRecipient(text, app);

  return {
    amount,
    recipient,
    utr_id,
    date: date ? date.toISOString() : null,
    app_source: app,
  };
}

// ─── App Detection ───────────────────────────────────────────────────────────
// Order is critical: Navi before Paytm (Navi VPAs often contain "paytm").
// BHIM falls back to its unique "Banking Name" label if header is cropped.

export function detectApp(text) {
  const t = text.toLowerCase();
  // Navi FIRST — its VPAs (e.g. "paytm-blinkit@ptybl") would trigger Paytm
  if (t.includes('navi transaction id') || t.includes('navi')) return 'navi';
  if (t.includes('phonepe') || t.includes('phone pe')) return 'phonepe';
  // Paytm after Navi
  if (t.includes('paytm') || t.includes('p@ytm') || t.includes('@ptyes') || t.includes('@pty')) return 'paytm';
  if (t.includes('google pay') || t.includes('gpay') || t.includes('g pay') || t.includes('@okaxis') || t.includes('@apl')) return 'googlepay';
  // BHIM: header may be cropped, but "Banking Name" label is unique to BHIM's layout
  if (t.includes('bhim') || t.includes("bharat's own payments")) return 'bhim';
  // BHIM fallback: has a unique 2-column grid layout with "Banking Name" + "Transaction ID" + "Date & Time"
  if (/banking name.*transaction id.*date/si.test(t)) return 'bhim';
  return 'unknown';
}

// ─── Amount Extraction ───────────────────────────────────────────────────────
// IMPORTANT: Large display fonts (₹500, ₹162) are often NOT OCR'd with the ₹ symbol.
// Google Pay dark theme: amount appears as bare "500" with ₹ on same line but OCR misses it.
// Paytm writes "Rupees Thirty Only" instead of a digit.
// Strategy:
//  1. Try rupee-prefixed amount
//  2. Try word-form numbers (Paytm "Rupees X Only")
//  3. Try contextual clues: "Paid to NAME\n\nAMOUNT" structure
//  4. Try "Amount\n₹30" label pattern
//  5. Find standalone number near payment keywords

const WORD_NUMBERS = {
  zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,
  eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,
  seventy:70,eighty:80,ninety:90,hundred:100,thousand:1000,lakh:100000,
};

function parseWordAmount(text) {
  // "Rupees Thirty Only" → 30
  // "Rupees One Hundred Twenty Only" → 120
  const m = text.match(/Rupees\s+(.+?)\s+Only/i);
  if (!m) return null;
  const words = m[1].toLowerCase().split(/\s+/);
  let total = 0;
  let current = 0;
  for (const w of words) {
    const n = WORD_NUMBERS[w];
    if (n === undefined) continue;
    if (n === 100) {
      current = (current || 1) * 100;
    } else if (n >= 1000) {
      total += (current || 1) * n;
      current = 0;
    } else {
      current += n;
    }
  }
  total += current;
  return total > 0 ? total : null;
}

export function extractAmount(text) {
  const patterns = [
    // Rupee symbol (may have space after it due to OCR)
    /[₹]\s*([\d,]+(?:\.\d{1,2})?)/,
    // "Rs." or "Rs " prefix (BHIM uses this)
    /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // INR prefix
    /INR\s*([\d,]+(?:\.\d{1,2})?)/i,
    // "Amount\n₹30" — Paytm label with rupee
    /amount\s*\n\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)/im,
    // Amount followed by action word
    /([\d,]+(?:\.\d{1,2})?)\s*(?:paid|sent|debited)/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (val > 0) return val;
    }
  }

  // Word-form amount (Paytm "Rupees Thirty Only")
  const wordAmt = parseWordAmount(text);
  if (wordAmt) return wordAmt;

  // ── Dark-theme fallback (GPay, PhonePe, BHIM, Navi) ──────────────────────
  // These apps render the amount in a large display font that Tesseract often
  // drops entirely (no ₹ symbol captured). Look for contextual clues instead.

  const topText = text.slice(0, 600);

  // "#100" embedded in a line (PhonePe: "BJ ooocccaser #100")
  const hashAmount = topText.match(/#\s*(\d{1,6}(?:\.\d{1,2})?)\b/);
  if (hashAmount) {
    const val = parseFloat(hashAmount[1]);
    if (val >= 1 && val <= 999999) return val;
  }

  // Last resort: standalone number on its own line, plausible UPI amount
  // Exclude: 4-digit bank account last-4 (preceded by bank/account context)
  const bankCtxPattern = /(?:India|Bank|account|XXXX|xxxx)\s*\n?\s*(\d{4})\b/gi;
  const bankNums = new Set();
  for (const m of text.matchAll(bankCtxPattern)) bankNums.add(m[1]);

  const lines = topText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip lines that contain bank/account context words
    if (/india|bank|account|xxxx|XXXX/i.test(trimmed)) continue;
    const stripped = trimmed.replace(/[^\d.]/g, '').trim();
    if (/^\d{1,6}(\.\d{1,2})?$/.test(stripped)) {
      const val = parseFloat(stripped);
      // Exclude 4-digit numbers that appear in bank context
      if (bankNums.has(stripped)) continue;
      // Plausible UPI range: ₹1 – ₹99999
      if (val >= 1 && val <= 99999) return val;
    }
  }

  return null;
}

// ─── UTR / Transaction ID Extraction ─────────────────────────────────────────
// Real OCR learnings:
//  - PhonePe has "PhonePe Transaction ID: T260..." (internal) AND "UTR: 185..." (bank ref)
//    → Must match "UTR:" label BEFORE "Transaction ID" label for PhonePe
//  - BHIM: "Transaction ID\n203616546987" — ID is on NEXT LINE after label (no colon)
//  - Paytm: "UPI Ref No: 314702870293 Copy" — has "Copy" after the number

export function extractUTR(text, app = 'unknown') {
  const appSpecificPatterns = {
    googlepay: [
      /UPI\s*transaction\s*ID\s*\n?\s*([A-Z0-9]{10,22})/i,
    ],
    phonepe: [
      // UTR: is the real bank reference — check BEFORE PhonePe Transaction ID
      /\bUTR\s*[:\-]?\s*([0-9]{10,15})\b/i,
      /UPI\s*Ref\.?\s*[:\-]?\s*([A-Z0-9]{10,22})/i,
      // PhonePe Transaction ID last (it's internal, not the bank UTR)
      /PhonePe\s*Transaction\s*ID\s*\n?\s*([A-Z0-9]{10,25})/i,
    ],
    paytm: [
      // "UPI Ref No: 314702870293 Copy" — stop before "Copy"
      /UPI\s*Ref\s*No[\.:]?\s*([0-9]{10,15})(?:\s*Copy)?/i,
      /\bUTR\s*[:\-]?\s*([A-Z0-9]{10,22})/i,
      /Transaction\s*ID\s*[:\-]?\s*([A-Z0-9]{10,22})/i,
      /Order\s*ID\s*[:\-]?\s*([A-Z0-9]{10,22})/i,
    ],
    bhim: [
      // Real OCR: "Transaction ID Date & Time\n203616546987 (J) 27th Sep 26"
      // The ID appears on the NEXT LINE — match digits after the newline
      /Transaction\s*ID\s+Date[^\n]*\n\s*(\d{10,15})/i,
      // Standard label variant
      /Transaction\s*ID\s*[:\-]?\s*\n?\s*(\d{10,15})\b/i,
      /Transaction\s*Reference\s*(?:No\.?|Number)\s*[:\-]?\s*([A-Z0-9]{10,22})/i,
      /Ref(?:erence)?\s*No\.?\s*[:\-]?\s*([A-Z0-9]{10,22})/i,
    ],
    navi: [
      // Navi has "UPI transaction ID\n005368009683" — prefer shorter UPI tx ID
      /UPI\s*transaction\s*ID\s*\n?\s*([0-9]{10,15})\b/i,
      /UPI\s*Ref\s*No\.?\s*[:\-]?\s*([A-Z0-9]{10,22})/i,
    ],
  };

  const appPatterns = appSpecificPatterns[app] || [];
  for (const p of appPatterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }

  // Generic fallback — also handles newline-separated IDs
  const genericPatterns = [
    /\bUTR\s*[:\-]?\s*([0-9]{10,15})\b/i,
    /(?:UPI\s*(?:transaction\s*)?ID|UPI\s*Ref(?:\s*No\.?)?|Transaction\s*(?:ID|Ref(?:erence)?)|Ref(?:erence)?\s*(?:No\.?|Number))\s*[:\n\-]?\s*([A-Z0-9]{10,22})/i,
    // Bank-prefixed UTR
    /\b([A-Z]{2,6}\d{10,16})\b/,
    // Pure 12-digit standalone number near a keyword
    /(?:ID|UTR|Ref)\s*[:\-]?\s*(\d{12,15})\b/i,
  ];

  for (const p of genericPatterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

// ─── Date Extraction ──────────────────────────────────────────────────────────

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function istToUtc(year, month, day, hour, minute) {
  const istMs = Date.UTC(year, month, day, hour, minute);
  return new Date(istMs - 5.5 * 60 * 60 * 1000);
}

function parseAmPm(hour, ampm) {
  const h = parseInt(hour, 10);
  if (ampm?.toUpperCase() === 'PM' && h !== 12) return h + 12;
  if (ampm?.toUpperCase() === 'AM' && h === 12) return 0;
  return h;
}

export function extractDate(text, app = 'unknown') {
  // Pattern 1: "27 Sep 2026, 10:09 PM" — Google Pay, Navi header
  // Also "27 Sept 2026, 11:47am" (GPay uses "Sept" abbreviation, no space before am/pm)
  {
    const p = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{4})[,\s·]+(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i;
    const m = text.match(p);
    if (m) {
      const day = parseInt(m[1], 10);
      const monStr = m[2].toLowerCase().replace('sept', 'sep');
      const mon = MONTH_MAP[monStr];
      const year = parseInt(m[3], 10);
      const hour = parseAmPm(m[4], m[6]);
      const min = parseInt(m[5], 10);
      return istToUtc(year, mon, day, hour, min);
    }
  }

  // Pattern 1b: "05:03 PM on 14 Aug 2026" — PhonePe header
  // OCR may garble month: "Auc" instead of "Aug" — accept any 3–4 char word, truncate to 3
  {
    const p = /(\d{1,2}):(\d{2})\s*(AM|PM)\s+on\s+(\d{1,2})\s+([A-Za-z]{3,4})\s+(\d{4})/i;
    const m = text.match(p);
    if (m) {
      const hour = parseAmPm(m[1], m[3]);
      const min = parseInt(m[2], 10);
      const day = parseInt(m[4], 10);
      const monStr = m[5].toLowerCase().slice(0, 3);
      const mon = MONTH_MAP[monStr];
      const year = parseInt(m[6], 10);
      // Only use if month is recognized (handles "Auc"->"auc" which is not a key)
      if (mon !== undefined) return istToUtc(year, mon, day, hour, min);
      // Fallback: try common OCR garbles aug->auc, jan->jan, etc.
      const garbleMap = { auc: 8, aua: 8, jua: 0, jum: 5, juy: 6, feb: 1 };
      const garbleMon = garbleMap[monStr];
      if (garbleMon !== undefined) return istToUtc(year, garbleMon, day, hour, min);
    }
  }

  // Pattern 1c: "Paid at 08:20 PM, 14 Sep 2026" — Paytm
  {
    const p = /(?:Paid\s+at\s+)?(\d{1,2}):(\d{2})\s*(AM|PM)[,\s]+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i;
    const m = text.match(p);
    if (m) {
      const hour = parseAmPm(m[1], m[3]);
      const min = parseInt(m[2], 10);
      const day = parseInt(m[4], 10);
      const mon = MONTH_MAP[m[5].toLowerCase()];
      const year = parseInt(m[6], 10);
      if (mon !== undefined) return istToUtc(year, mon, day, hour, min);
    }
  }

  // Pattern 1d: "27th Sep 26, 08:36 pm" — BHIM 2-digit year
  // OCR sometimes splits across lines: "27th Sep 26, 08:36\npm"
  {
    const p = /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2})[,\s]+(\d{1,2}):(\d{2})\s*\n?\s*(AM|PM)/i;
    const m = text.match(p);
    if (m) {
      const day = parseInt(m[1], 10);
      const mon = MONTH_MAP[m[2].toLowerCase()];
      const yr = parseInt(m[3], 10);
      const year = yr < 50 ? 2000 + yr : 1900 + yr;
      const hour = parseAmPm(m[4], m[6]);
      const min = parseInt(m[5], 10);
      if (mon !== undefined) return istToUtc(year, mon, day, hour, min);
    }
  }

  // Pattern 2: "Sep 15, 2026 · 3:42 PM" — Navi variant
  {
    const p = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})\s*[·\-,]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const m = text.match(p);
    if (m) {
      const mon = MONTH_MAP[m[1].toLowerCase()];
      const day = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      const hour = parseAmPm(m[4], m[6]);
      const min = parseInt(m[5], 10);
      return istToUtc(year, mon, day, hour, min);
    }
  }

  // Pattern 3: "15-09-2026 15:42:00" or "15/09/2026 15:42" — Paytm, BHIM (24h)
  {
    const p = /(\d{2})[-\/](\d{2})[-\/](\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/;
    const m = text.match(p);
    if (m) {
      const day = parseInt(m[1], 10);
      const mon = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const hour = parseInt(m[4], 10);
      const min = parseInt(m[5], 10);
      return istToUtc(year, mon, day, hour, min);
    }
  }

  // Pattern 4: "15/09/2026, 3:42 PM" — Paytm variant with AM/PM
  {
    const p = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})[,\s]+(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const m = text.match(p);
    if (m) {
      const day = parseInt(m[1], 10);
      const mon = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const hour = parseAmPm(m[4], m[6]);
      const min = parseInt(m[5], 10);
      return istToUtc(year, mon, day, hour, min);
    }
  }

  return null;
}

// ─── Recipient Extraction ─────────────────────────────────────────────────────
// Real OCR learnings:
//  - "To: ARYAN MAURYA" works, but stop word list must exclude "UPI", digits, newlines
//  - Navi: "Paid to\nax Blinkit View history" — "ax" is OCR garbage from app icon
//          Need to strip leading 2-char garbage and trailing "View history"
//  - PhonePe: "Paid to\n[icon] Riya" — icon becomes garbage chars
//  - Banking Name label in BHIM gives us the recipient

export function extractRecipient(text, app = 'unknown') {
  // BHIM: "Banking Name\nUMESH MEENA" — most reliable for BHIM
  if (app === 'bhim') {
    const m = text.match(/Banking\s+Name\s*\n\s*([A-Z][A-Z\s]{1,40})(?=\n)/i);
    if (m) return m[1].trim();
  }

  // PhonePe: "Banking Name © Miss Riya Mishra" (OCR noise between label and name)
  if (app === 'phonepe') {
    const m = text.match(/Banking\s+Name\s*[^A-Za-z\n]{0,5}(?:Miss|Mr|Mrs|Dr\.?)?\s*([A-Za-z][A-Za-z\s\.]{2,40})/i);
    if (m) return m[1].trim();
  }
  {
    const p = /(?:Paid\s+to|Sent\s+to|Payment\s+to|Transferred\s+to)\s*\n\s*(?:[^\w\n]{0,8})?([A-Za-z][A-Za-z0-9\s\.&'-]{1,45})(?:\s+View|\s+UPI|\s+history|\n|\d{8}|$)/i;
    const m = text.match(p);
    if (m) {
      let name = m[1].trim()
        .replace(/\s+(View|history|Share|Copy|Edit|again).*$/i, '')
        .trim();
      if (name.length > 1 && name.length < 50) return name;
    }
  }

  // Pattern B: "To: NAME" or "To NAME" on same line — clean text
  {
    const p = /\bTo\s*[:\-]\s*([A-Za-z][A-Za-z0-9\s\.&'-]{1,40})(?:\s+View|\s+UPI|\n|\d{8}|$)/i;
    const m = text.match(p);
    if (m) {
      const name = m[1].trim().replace(/\s+(View|history|Share|Copy|Edit).*$/i, '').trim();
      if (name.length > 1 && name.length < 50) return name;
    }
  }

  // Pattern B2: "To NAME\n" without colon — Navi uses this
  {
    const p = /\bTo\s+([A-Za-z][A-Za-z0-9\s\.&'-]{1,40})(?:\n|\s+UPI|\s+View|\d{8}|$)/i;
    const m = text.match(p);
    if (m) {
      const name = m[1].trim().replace(/\s+(View|history|Share|Copy|Edit).*$/i, '').trim();
      if (name.length > 1 && name.length < 50) return name;
    }
  }

  // Pattern C: "Paid to NAME" inline (no newline) — simple synthetic text
  {
    const p = /(?:Paid\s+to|Sent\s+to)\s+([A-Za-z][A-Za-z0-9\s\.&'-]{1,40})(?:\n|UPI|₹|\d{10}|$)/i;
    const m = text.match(p);
    if (m) {
      const name = m[1].trim();
      if (name.length > 1 && name.length < 50) return name;
    }
  }

  // Pattern D: PhonePe Banking Name (verified recipient name)
  {
    const p = /Banking\s+Name\s*[:\-]?\s*(?:Miss|Mr|Mrs|Dr)?\s*([A-Za-z][A-Za-z0-9\s\.]{2,40})/i;
    const m = text.match(p);
    if (m) return m[1].trim();
  }

  // Fallback: first VPA that isn't the sender's account
  const vpaMatches = [...text.matchAll(/([a-zA-Z0-9._+%-]+@[a-zA-Z0-9.-]{2,20})/g)];
  for (const m of vpaMatches) {
    const vpa = m[1];
    if (/okaxis|ptyes|okhdfc|oksbi/i.test(vpa)) continue; // skip sender VPAs
    return vpa;
  }

  return null;
}
