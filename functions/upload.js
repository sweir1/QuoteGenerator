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
      callback(new Error('Only Word, PDF, Excel, and PPT files are allowed.'));
    }
  }
});

app.post('/.netlify/functions/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.pdf') {
    // Handle PDF files using pdf-parse
    pdfParse(file.buffer).then(data => {
      const text = data.text;
      const wordCount = text.trim().split(/\s+/).length;
      const price = calculatePrice(wordCount);
      res.json({ price });
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
        const price = calculatePrice(wordCount);
        res.json({ price });
      }
    });
  }
});

function calculatePrice(wordCount) {
  // Implement your pricing logic here
  // For simplicity, let's assume the price is $10 per 100 words
  return (wordCount / 100) * 10;
}

module.exports.handler = serverless(app);
