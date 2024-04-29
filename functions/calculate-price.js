import fetch from 'node-fetch';

export async function handler(event, context) {
   try {
      if (event.httpMethod !== 'POST') {
         return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
         };
      }

      const { fileUUID, deliverySpeed } = JSON.parse(event.body);

      // Make an API request to get the word count
      const response = await fetch(`https://api.uploadcare.com/files/${fileUUID}/`, {
         headers: {
            'Authorization': `Uploadcare.Simple ${process.env.UPLOADCARE_PUBLIC_KEY}:${process.env.UPLOADCARE_SECRET_KEY}`,
         },
      });

      const data = await response.json();
      const wordCount = data.file_info.wordcount || 0;

      // Define the pricing rates
      const rates = {
         '24': 0.02,
         '48': 0.01,
      };

      // Calculate the price
      const rate = rates[deliverySpeed];
      const price = wordCount * rate;

      return {
         statusCode: 200,
         body: JSON.stringify({ price }),
      };
   } catch (error) {
      return {
         statusCode: 500,
         body: JSON.stringify({ error: 'Internal Server Error' }),
      };
   }
}
