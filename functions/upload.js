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
  'https://eduardos-stupendous-site-4488f5.webflow.io/get-a-quote',
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

  // Set CORS headers if origin is allowed
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  const file = req.file;
  const turnaroundTime = req.body.turnaroundTime;
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.pdf') {
    pdfParse(file.buffer).then(data => {
      const text = data.text;
      const wordCount = text.trim().split(/\s+/).length;
      const basePrice = calculatePrice(wordCount);
      const totalPrice = applyTurnaroundTimeMultiplier(basePrice, turnaroundTime);
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
        const totalPrice = applyTurnaroundTimeMultiplier(basePrice, turnaroundTime);
        res.json({ price: totalPrice });
      }
    });
  }
});

function calculatePrice(wordCount) {
  return (wordCount / 100) * 10;
}

function applyTurnaroundTimeMultiplier(basePrice, turnaroundTime) {
  const multipliers = {
    '24 hours': 1.5,
    '48 hours': 1.2,
    '3 days': 1.0,
  };

  const multiplier = multipliers[turnaroundTime] || 1.0;
  return basePrice * multiplier;
}

module.exports.handler = serverless(app);
