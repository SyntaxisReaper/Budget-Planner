/**
 * receiptScanner.js
 * Orchestrates UPI receipt scanning with dual-engine approach:
 *   Primary:  Gemini Vision  — understands context, handles any font/layout
 *   Fallback: Tesseract OCR  — pure JS, no network, works offline
 *
 * Real-image learnings (validated against actual screenshots):
 *   - Amounts in large display fonts (GPay, BHIM, Navi) are NOT captured by Tesseract.
 *     Gemini Vision handles all of these correctly.
 *   - PhonePe date garbles "Aug" → "Auc" in OCR. Gemini reads it correctly.
 *   - Paytm word-form amount "Rupees Thirty Only" is handled by regex parser.
 *   - UTR/Ref IDs are reliably captured by both engines.
 */

import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseReceiptText } from './receiptParser.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Primary: Gemini Vision ────────────────────────────────────────────────────

const GEMINI_PROMPT = `You are a UPI payment receipt parser. Extract the following fields from this screenshot and return ONLY a valid JSON object with no extra text, no markdown fences, no explanation.

Required fields:
{
  "amount": <number — the payment amount, no currency symbol, no commas. e.g. 1200.00>,
  "recipient": <string — the name or UPI VPA the money was sent TO. Not the sender.>,
  "utr_id": <string — the UTR / UPI Transaction ID / Reference Number shown on screen. Typically 12 digits.>,
  "date": <string — ISO 8601 format: YYYY-MM-DDTHH:mm:ss+05:30. Convert from whatever format shown. All times are IST.>,
  "app_source": <string — one of: "googlepay" | "phonepe" | "paytm" | "bhim" | "navi" | "unknown">,
  "confidence": <number — 0.0 to 1.0, how confident you are that all fields are correct>
}

Rules:
- amount must be a positive number (e.g. 500, not "₹500")
- If a field is not visible, set it to null
- For date, assume IST (UTC+5:30) and include the +05:30 offset
- utr_id: prefer the bank UTR over internal app transaction IDs
- Do not include any text outside the JSON object`;

export async function scanWithGemini(base64Image, mimeType = 'image/jpeg') {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  });

  const result = await model.generateContent([
    { inlineData: { data: base64Image, mimeType } },
    GEMINI_PROMPT,
  ]);

  const raw = result.response.text().trim();
  // Strip accidental markdown code fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${raw.slice(0, 120)}`);
  }

  if (!parsed.amount || Number(parsed.amount) <= 0) {
    throw new Error('Gemini returned invalid or missing amount');
  }

  return {
    amount:     Number(parsed.amount),
    recipient:  parsed.recipient  ?? null,
    utr_id:     parsed.utr_id     ?? null,
    date:       parsed.date       ?? null,
    app_source: parsed.app_source ?? 'unknown',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
    engine:     'gemini',
  };
}

// ─── Fallback: Tesseract OCR + regex parser ────────────────────────────────────

export async function scanWithOCR(imageBuffer) {
  // Preprocess: greyscale + auto-contrast + sharpen
  // Critical for PhonePe/Paytm gradient backgrounds
  const processed = await sharp(imageBuffer)
    .greyscale()
    .normalise()
    .sharpen()
    .toBuffer();

  const { data: { text } } = await Tesseract.recognize(processed, 'eng', {
    // Allow newlines so multi-line layout patterns work
    tessedit_char_whitelist:
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz₹.,/:@-\n #&()',
  });

  const result = parseReceiptText(text);

  // OCR can still succeed even without amount (amount = null for dark-theme apps)
  // The merge step will fill in Gemini's amount. Only throw if nothing was extracted.
  if (!result.utr_id && !result.date && !result.recipient) {
    throw new Error('OCR extracted no usable fields from this image');
  }

  return { ...result, confidence: 0.6, engine: 'ocr' };
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────

/**
 * scanReceipt — tries Gemini first, falls back to Tesseract.
 * If Gemini confidence < 0.7, runs OCR too and merges (best of both).
 *
 * @param {string}  base64Image  — base64-encoded image
 * @param {Buffer}  imageBuffer  — raw image buffer (for Tesseract)
 * @param {string}  mimeType     — e.g. 'image/jpeg'
 * @returns {object} Normalized receipt data
 */
export async function scanReceipt(base64Image, imageBuffer, mimeType) {
  let geminiResult = null;
  let ocrResult = null;

  // 1. Try Gemini
  try {
    geminiResult = await scanWithGemini(base64Image, mimeType);
  } catch (err) {
    console.warn('[receiptScanner] Gemini failed:', err.message);
  }

  // 2. Run OCR in parallel if Gemini low-confidence or failed
  const needOCR = !geminiResult || geminiResult.confidence < 0.7;
  if (needOCR) {
    try {
      ocrResult = await scanWithOCR(imageBuffer);
    } catch (err) {
      console.warn('[receiptScanner] OCR fallback failed:', err.message);
    }
  }

  // 3. Merge / decide
  if (geminiResult && ocrResult) {
    return mergeResults(geminiResult, ocrResult);
  }
  if (geminiResult) return geminiResult;
  if (ocrResult)    return ocrResult;

  throw new Error('Both Gemini and OCR failed to extract receipt data');
}

// ─── Merge: Gemini fields take priority; OCR fills gaps ───────────────────────

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
