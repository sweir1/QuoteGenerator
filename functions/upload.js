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

function calculatePrice(wordCount, quality) {
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

function processFile(file, turnaroundTime, quality) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.pdf') {
    return pdfParse(file.buffer).then(data => {
      const text = data.text;
      const wordCount = text.trim().split(/\s+/).length;
      const basePrice = calculatePrice(wordCount, quality);
      const totalPrice = applyTurnaroundTimeSurcharge(basePrice, turnaroundTime, wordCount);
      return totalPrice;
    });
  } else {
    return new Promise((resolve, reject) => {
      textract.fromBufferWithName(file.originalname, file.buffer, (error, text) => {
        if (error) {
          reject(error);
        } else {
          const wordCount = text.trim().split(/\s+/).length;
          const basePrice = calculatePrice(wordCount, quality);
          const totalPrice = applyTurnaroundTimeSurcharge(basePrice, turnaroundTime, wordCount);
          resolve(totalPrice);
        }
      });
    });
  }
}

app.post('/.netlify/functions/upload', upload.single('file'), (req, res) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  const file = req.file;
  const turnaroundTime = req.body.turnaroundTime;
  const quality = req.body.quality;

  processFile(file, turnaroundTime, quality)
    .then(price => {
      res.json({ price });
    })
    .catch(error => {
      console.error('Error processing file:', error);
      res.status(500).json({ error: 'Failed to process the file.' });
    });
});

module.exports = {
  handler: serverless(app),
  processFile,
};
