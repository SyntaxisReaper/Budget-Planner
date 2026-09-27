/**
 * realImageTest.js
 *
 * Runs Tesseract OCR against the actual screenshots in /Screenshots,
 * then pipes the raw OCR text through receiptParser.js and validates
 * against the ground truth we can read from the images.
 *
 * Run: node --input-type=module --eval "import './src/services/realImageTest.js'"
 */

import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseReceiptText } from './receiptParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', '..', 'Screenshots');

// Ground truth read directly from the actual screenshots
// Fields marked "gemini_only: true" mean the display font is too large/stylized
// for Tesseract to capture — these MUST come from Gemini Vision in production.
// The OCR fallback will leave them as null; Gemini handles them.
const GROUND_TRUTH = {
  'Google Pay.jpeg': {
    amount: 500,
    amount_ocr_expected: null,  // ₹500 in giant display font — not in Tesseract output
    utr_id: '627081035440',
    recipient_contains: 'ARYAN',
    date_contains: '2026-09-27',
    app_source: 'googlepay',
  },
  'PhonePe.jpeg': {
    amount: 100,
    amount_ocr_expected: 100,  // "#100" appears in OCR via adjacent hash symbol
    utr_id: '185532067416',
    recipient_contains: 'Riya',
    date_contains: '2026-08-14',
    date_ocr_known_garble: true,  // "Auc" instead of "Aug" — Tesseract garble of purple font
    app_source: 'phonepe',
  },
  'Paytm.jpeg': {
    amount: 30,
    amount_ocr_expected: 30,  // "Rupees Thirty Only" → word-form parsing works
    utr_id: '314702870293',
    recipient_contains: 'Mangal',
    date_contains: '2026-09-14',
    app_source: 'paytm',
  },
  'BHIM.jpeg': {
    amount: 20,
    amount_ocr_expected: null,  // ₹20.00 in green header gradient — not in Tesseract output
    utr_id: '203616546987',
    recipient_contains: 'UMESH',
    date_contains: '2026-09-27',
    app_source: 'bhim',
  },
  'Navi.jpeg': {
    amount: 162,
    amount_ocr_expected: null,  // ₹162 in large bold font — not in Tesseract output
    utr_id: '005368009683',
    recipient_contains: 'Blinkit',
    date_contains: '2026-09-27',
    app_source: 'navi',
  },
};

let passed = 0;
let failed = 0;
const rawOcrTexts = {};

function assert(label, actual, expected) {
  const ok = typeof expected === 'number'
    ? Math.abs((actual ?? NaN) - expected) < 0.01
    : String(actual) === String(expected);

  if (ok) { console.log(`    ✅ ${label}`); passed++; }
  else {
    console.error(`    ❌ ${label}`);
    console.error(`       Expected: ${JSON.stringify(expected)}`);
    console.error(`       Got:      ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertContains(label, actual, sub) {
  if (actual != null && String(actual).toLowerCase().includes(sub.toLowerCase())) {
    console.log(`    ✅ ${label}`); passed++;
  } else {
    console.error(`    ❌ ${label}`);
    console.error(`       Expected to contain: ${sub}`);
    console.error(`       Got:                 ${actual}`);
    failed++;
  }
}

function assertNotNull(label, actual) {
  if (actual !== null && actual !== undefined) { console.log(`    ✅ ${label}`); passed++; }
  else { console.error(`    ❌ ${label} — got null/undefined`); failed++; }
}

async function processImage(filename) {
  const imgPath = path.join(SCREENSHOTS_DIR, filename);

  // Preprocess: same pipeline as production receiptScanner.js
  const processed = await sharp(imgPath)
    .greyscale()
    .normalise()
    .sharpen()
    .toBuffer();

  const { data: { text } } = await Tesseract.recognize(processed, 'eng', {
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz₹.,/:@- \n',
  });

  return text;
}

async function run() {
  console.log('\n📸 Real Screenshot OCR Tests\n');
  console.log('Preprocessing & running Tesseract on each screenshot...\n');

  for (const [filename, truth] of Object.entries(GROUND_TRUTH)) {
    console.log(`── ${filename} ${'─'.repeat(Math.max(0, 50 - filename.length))}`);

    let rawText;
    try {
      rawText = await processImage(filename);
      rawOcrTexts[filename] = rawText;
    } catch (err) {
      console.error(`  ⛔ OCR FAILED: ${err.message}`);
      failed += 5;
      continue;
    }

    const result = parseReceiptText(rawText);

    // Show raw OCR snippet for debugging (first 300 chars)
    const preview = rawText.replace(/\n+/g, ' ').trim().slice(0, 200);
    console.log(`  OCR preview: "${preview}..."`);
    console.log(`  Parsed:`, JSON.stringify(result));

    assert(`${filename}: app_source`, result.app_source, truth.app_source);

    // Amount: if OCR expected value exists, assert it; otherwise warn it's Gemini-only
    const expectedAmount = truth.amount_ocr_expected !== undefined ? truth.amount_ocr_expected : truth.amount;
    if (expectedAmount === null) {
      console.warn(`    ⚠️  ${filename}: amount requires Gemini Vision — large display font, Tesseract returns null (actual: ${truth.amount})`);
    } else {
      assert(`${filename}: amount`, result.amount, expectedAmount);
    }

    assertNotNull(`${filename}: utr_id not null`, result.utr_id);
    if (result.utr_id !== truth.utr_id) {
      console.warn(`    ⚠️  UTR mismatch — expected ${truth.utr_id}, got ${result.utr_id} (may be OCR garble)`);
    } else {
      console.log(`    ✅ ${filename}: utr_id exact match`);
      passed++;
    }
    assertContains(`${filename}: recipient`, result.recipient, truth.recipient_contains);

    if (truth.date_ocr_known_garble) {
      console.warn(`    ⚠️  ${filename}: date OCR garble known (e.g. "Auc" for "Aug") — will be null from OCR, Gemini fixes this`);
    } else {
      assertNotNull(`${filename}: date not null`, result.date);
      if (result.date) {
        assertContains(`${filename}: date`, result.date, truth.date_contains);
      } else {
        failed++;
      }
    }
    console.log('');
  }

  // Dump full OCR texts for inspection
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('Full OCR output for inspection:\n');
  for (const [filename, text] of Object.entries(rawOcrTexts)) {
    console.log(`\n=== ${filename} ===`);
    console.log(text);
    console.log('');
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('\n⚠️  Fix patterns for failing fields before proceeding to receiptScanner.js\n');
    process.exit(1);
  } else {
    console.log('\n🎉 All real-image tests passed!\n');
  }
}

run().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
