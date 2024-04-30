const express = require('express');
const serverless = require('serverless-http');
const multer = require('multer');
const path = require('path');
const textract = require('textract');
const pdfParse = require('pdf-parse');

const app = express();

const allowedOrigins = [
  'http://localhost:8888', // Local development domain, adjust if needed
  'https://lucky-liger-cadc9d.netlify.app', // Replace with your production domain
  'https://eduardos-stupendous-site-4488f5.webflow.io',
  'https://www.typewriters.ai'

  // Add other allowed domains as needed
];

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, callback) {
    const allowedExtensions = ['.doc', '.docx', '.pdf', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      callback(null, true);
    } else {
      callback(new Error('Only Word, PDF, Excel, PPT, and text files are allowed.'));
    }
  }
});

app.post('/.netlify/functions/upload', upload.single('file'), (req, res) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  const file = req.file;
  const turnaroundTime = req.body.turnaroundTime;
  const quality = req.body.quality; // Capture the new "quality" field
  const ext = path.extname(file.originalname).toLowerCase();

  function calculatePrice(wordCount) {

    let basePrice;
    if (wordCount < 501) {
      basePrice = 0.12; // Small requests
    } else if (wordCount <= 1500) {
      basePrice = 0.10; // Medium requests
    } else {
      basePrice = 0.08; // Large requests
    }

    // Apply quality surcharge if business-specific
    if (quality === 'Business specific') {
      basePrice += 0.02; // Additional $0.02 per word
    }

    return wordCount * basePrice;
  }

  function applyTurnaroundTimeSurcharge(basePrice, turnaroundTime, wordCount) {
    let total = basePrice;

    if (turnaroundTime === '24 hours') {
      if (wordCount < 501) {
        total += 15; // $15 surcharge for small requests
      } else if (wordCount <= 1500) {
        total += 15; // $15 surcharge for medium requests
      } else {
        total += 25; // $25 surcharge for large requests
      }
    }

    return total;
  }

  if (ext === '.pdf') {
    pdfParse(file.buffer).then(data => {
      const text = data.text;
      const wordCount = text.trim().split(/\s+/).length;
      const basePrice = calculatePrice(wordCount);
      const totalPrice = applyTurnaroundTimeSurcharge(basePrice, turnaroundTime, wordCount);
      res.json({ price: totalPrice });
    }).catch(error => {
      console.error('Error parsing PDF:', error);
      res.status(500).json({ error: 'Failed to parse the PDF file.' });
    });
  } else {
    textract.fromBufferWithName(file.originalname, file.buffer, (error, text) => {
      if (error) {
        console.error('Error extracting text:', error);
        res.status(500).json({ error: 'Failed to extract text from the file.' });
      } else {
        const wordCount = text.trim().split(/\s+/).length;
        const basePrice = calculatePrice(wordCount);
        const totalPrice = applyTurnaroundTimeSurcharge(basePrice, turnaroundTime, wordCount);
        res.json({ price: totalPrice });
      }
    });
  }
});

module.exports.handler = serverless(app);
