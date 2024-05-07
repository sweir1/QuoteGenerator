const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');

exports.handler = async (event, context) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Stripe event constructed successfully');
  } catch (err) {
    console.error('Error constructing Stripe event:', err);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    console.log('Checkout session completed event received');
    const session = stripeEvent.data.object;

    if (session.payment_status === 'paid') {
      console.log('Payment status: paid');
      const businessSpecific = session.metadata.businessSpecific;
      const cost = session.amount_total / 100; // Convert from cents to dollars
      const turnaroundTime = session.metadata.turnaroundTime;
      const fileId = session.metadata.fileId;

      try {
        // Initialize Google Drive API client
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS.replace(/'/g, '"')),
          scopes: ['https://www.googleapis.com/auth/drive'],
        });
        const drive = google.drive({ version: 'v3', auth });
        console.log('Google Drive API client initialized');

        // Create a folder in Google Drive to store the uploaded files
        const folderName = `Order_${Date.now()}`; // Use a unique folder name based on the current timestamp
        const folderMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['1jOZcw-_tr71AuFq55YckTWeYg5VpjEYy'],
        };
        const folder = await drive.files.create({
          resource: folderMetadata,
          fields: 'id, webViewLink',
        });
        const folderId = folder.data.id;
        const folderLink = folder.data.webViewLink;
        console.log('Folder created in Google Drive with ID:', folderId);
        console.log('Folder link:', folderLink);

        // Retrieve the temporarily stored files
        const tempFiles = [];
        for (let i = 0; i < 2; i++) {
          const tempFileName = `${fileId}_${i}_`;
          const tempFilePath = path.join('/tmp', tempFileName);
          const tempFileExists = await fs.access(tempFilePath).then(() => true).catch(() => false);
          if (tempFileExists) {
            const tempFileBuffer = await fs.readFile(tempFilePath);
            const tempFile = {
              name: tempFileName.replace(/^[^_]+_[^_]+_/, ''),
              data: tempFileBuffer.toString('base64'),
              type: mime.lookup(tempFileName) || 'application/octet-stream',
            };
            tempFiles.push(tempFile);
          }
        }

        // Upload each file to the created folder in Google Drive
        for (const file of tempFiles) {
          const fileMetadata = {
            name: file.name,
            parents: [folderId], // Use the ID of the created folder
          };
          const media = {
            mimeType: file.type,
            body: Buffer.from(file.data, 'base64'),
          };
          await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
          });
          console.log('File uploaded to Google Drive:', file.name);
        }

        // Store the additional details in a file in Google Drive
        const orderDetails = {
          businessSpecific,
          cost,
          turnaroundTime,
          timestamp: new Date().toISOString(),
        };
        const orderDetailsFileName = 'order_details.json';
        const orderDetailsFileMetadata = {
          name: orderDetailsFileName,
          parents: [folderId],
          mimeType: 'application/json',
        };
        const orderDetailsFileMedia = {
          mimeType: 'application/json',
          body: JSON.stringify(orderDetails),
        };
        await drive.files.create({
          resource: orderDetailsFileMetadata,
          media: orderDetailsFileMedia,
          fields: 'id',
        });
        console.log('Order details stored in Google Drive');

        // Delete the temporarily stored files
        await Promise.all(tempFiles.map((tempFile) => {
          const tempFileName = `${fileId}_${tempFiles.indexOf(tempFile)}_${tempFile.name}`;
          const tempFilePath = path.join('/tmp', tempFileName);
          return fs.unlink(tempFilePath);
        }));

        return {
          statusCode: 200,
          body: 'Payment successfully processed and files uploaded to Google Drive',
        };
      } catch (error) {
        console.error('Error uploading files to Google Drive:', error);
        return {
          statusCode: 500,
          body: 'Payment processed, but an error occurred while uploading files to Google Drive',
        };
      }
    } else {
      console.log('Payment not completed');

      // Delete the temporarily stored files
      for (let i = 0; i < 2; i++) {
        const tempFileName = `${fileId}_${i}_`;
        const tempFilePath = path.join('/tmp', tempFileName);
        await fs.unlink(tempFilePath).catch(() => {});
      }
      return {
        statusCode: 200,
        body: 'Payment not completed',
      };
    }
  }

  console.log('Unhandled event type:', stripeEvent.type);
  return {
    statusCode: 400,
    body: `Unhandled event type: ${stripeEvent.type}`,
  };
};
