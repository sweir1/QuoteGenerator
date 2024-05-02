const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);

    // Handle the successful payment event
    // ...

    return {
      statusCode: 200,
      body: 'Payment successfully processed',
    };
  }

  return {
    statusCode: 400,
    body: `Unhandled event type: ${stripeEvent.type}`,
  };
};
