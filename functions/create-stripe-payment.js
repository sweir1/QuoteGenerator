const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { processFile } = require('./upload'); // Import the processFile function from upload.js

const app = express();
app.use(express.json());

const allowedOrigins = [
  'http://localhost:8888',
  'https://lucky-liger-cadc9d.netlify.app',
  'https://eduardos-stupendous-site-4488f5.webflow.io',
  'https://www.typewriters.ai',
  'https://jovial-treacle-09f7aa.netlify.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/.netlify/functions/create-stripe-payment', upload.fields([{ name: 'file' }, { name: 'contextFile' }]), async (req, res) => {
  try {
    const file = req.files['file'][0];
    const turnaroundTime = req.body.turnaroundTime;
    const quality = req.body.quality;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const price = await processFile(file, turnaroundTime, quality);
    const priceInCents = Math.round(price * 100);

    const priceObject = await stripe.prices.create({
      unit_amount: priceInCents,
      currency: 'usd',
      product_data: {
        name: 'Fixed Payment',
      },
    });
    console.log('Created Stripe Price object:', priceObject);

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: priceObject.id,
          quantity: 1,
        },
      ],
    });
    console.log('Generated Stripe Payment Link:', paymentLink);

    res.json({ paymentLink: paymentLink.url });
  } catch (error) {
    console.error('Error generating Stripe payment link:', error);
    res.status(500).json({ error: 'Failed to generate Stripe payment link' });
  }
});

module.exports.handler = serverless(app);
