const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const serverless = require('serverless-http');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const { processFile } = require('./upload');

const allowedOrigins = [
  'http://localhost:8888', // Local development domain, adjust if needed
  'https://lucky-liger-cadc9d.netlify.app', // Replace with your production domain
  'https://eduardos-stupendous-site-4488f5.webflow.io',
  'https://www.typewriters.ai',
  // Add other allowed domains as needed
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(corsOptions));

app.post('/.netlify/functions/create-stripe-payment', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const turnaroundTime = req.body.turnaroundTime;
    const quality = req.body.quality;

    // Call the processFile function to calculate the price
    const price = await processFile(file, turnaroundTime, quality);

    // Create a Price object
    const priceObject = await stripe.prices.create({
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: 'usd',
      product_data: {
        name: 'Document Processing',
      },
    });

    // Generate the Stripe payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: priceObject.id,
          quantity: 1,
        },
      ],
    });

    res.json({ paymentLink: paymentLink.url });
  } catch (error) {
    console.error('Error generating Stripe payment link:', error);
    res.status(500).json({ error: 'Failed to generate Stripe payment link.' });
  }
});

module.exports.handler = serverless(app);
