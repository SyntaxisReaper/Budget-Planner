/**
 * routes/receipts.js
 * POST /api/receipts/scan — accepts a multipart image upload, returns parsed receipt data.
 *
 * Uses memory storage (no disk writes). Image goes straight to Gemini/Tesseract.
 * Returns normalized JSON for the frontend to pre-fill the transaction modal.
 */

import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { scanReceipt } from '../services/receiptScanner.js';

const router = Router();
router.use(authenticate);

// Memory storage — image buffer goes directly to Gemini/Tesseract, never touches disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are accepted'));
    }
    cb(null, true);
  },
});

/**
 * POST /api/receipts/scan
 * Body: multipart/form-data with field "receipt" containing the screenshot image
 * Returns: { amount, recipient, utr_id, occurred_at, app_source, engine, note }
 */
router.post('/scan', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided. Send image as multipart field "receipt".' });
  }

  const base64 = req.file.buffer.toString('base64');
  const result = await scanReceipt(base64, req.file.buffer, req.file.mimetype);

  // Build a helpful auto-note from the scanned data
  const autoNote = result.recipient
    ? `Paid to ${result.recipient}`
    : undefined;

  let existingTransaction = null;
  if (result.utr_id) {
    const { data } = await supabase
      .from('transactions')
      .select('id, amount, occurred_at')
      .eq('user_id', req.userId)
      .eq('utr_id', result.utr_id)
      .maybeSingle();
    
    if (data) {
      existingTransaction = data;
    }
  }

  res.json({
    amount:      result.amount,

    recipient:   result.recipient,
    utr_id:      result.utr_id,
    occurred_at: result.date,   // ISO 8601 string (IST offset), or null
    app_source:  result.app_source,
    engine:      result.engine, // "gemini" | "ocr" | "gemini+ocr"
    confidence:  result.confidence,
    note:        autoNote,
    // low_confidence flag — frontend shows a yellow warning banner
    low_confidence: (result.confidence ?? 1) < 0.7,
    existing_transaction: existingTransaction,
  });
});

export default router;
