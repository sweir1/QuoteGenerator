const express = require('express');
const serverless = require('serverless-http');
const multer = require('multer');
const path = require('path');
const textract = require('textract');
const pdfParse = require('pdf-parse');

const app = express();

// Configure multer storage and file filter
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
  const file = req.file;
  const turnaroundTime = req.body.turnaroundTime;
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.pdf') {
    // Handle PDF files using pdf-parse
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
    // Handle other file types using textract
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
  // Implement your pricing logic here
  // For simplicity, let's assume the price is $10 per 100 words
  return (wordCount / 100) * 10;
}

function applyTurnaroundTimeMultiplier(basePrice, turnaroundTime) {
  // Adjust the multipliers based on your pricing strategy
  const multipliers = {
    '24 hours': 1.5,
    '48 hours': 1.2,
    '3 days': 1.0
    // Add more options as needed
  };

  const multiplier = multipliers[turnaroundTime] || 1.0;
  return basePrice * multiplier;
}

module.exports.handler = serverless(app);
