const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { google } = require("googleapis");
const nodemailer = require("nodemailer");

// const fs = require("fs").promises;
// const path = require("path");
// const mime = require('mime-types');

const moveFolder = async ({ drive, folderId, newParentId }) => {
    try {
        const folderMetadata = await drive.files.get({
            fileId: folderId,
            fields: "parents",
        });

        const currentParents = folderMetadata.data.parents.join(",");

        const updatedFolder = await drive.files.update({
            fileId: folderId,
            addParents: newParentId,
            removeParents: currentParents,
            fields: "id, parents, webViewLink",
        });

        console.log(`Folder ${folderId} has been moved to ${newParentId}.`);
        return updatedFolder.data.webViewLink;
    } catch (error) {
        console.error(`Error moving folder: ${error}`);
        return null;
    }
};

const deleteFolder = async ({ drive, folderId }) => {
    try {
        await drive.files.delete({
            fileId: folderId,
        });

        console.log(`Folder with ID ${folderId} has been deleted.`);
    } catch (error) {
        console.error("Error deleting folder:", error);
    }
};

async function sendOrderEmail(orderDetails) {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // Prepare the folder link section
    let folderLinkSection = '';
    if (orderDetails.folderLink) {
        folderLinkSection = `
        <p>
            <a href="${orderDetails.folderLink}" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: #ffffff; text-decoration: none; border-radius: 5px;">View Order Folder</a>
        </p>
        `;
    }

    const htmlContent = `
    <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                h2 { color: #2980b9; }
                .order-details { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                .order-details p { margin: 5px 0; }
                .highlight { font-weight: bold; color: #2c3e50; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>New Order Received - Typewriters.ai</h1>
                <p>A new translation order has been received and paid for. Here are the details:</p>

                <div class="order-details">
                    <h2>Order Information</h2>
                    <p><span class="highlight">Order ID:</span> ${orderDetails.stripeSessionId}</p>
                    <p><span class="highlight">Timestamp:</span> ${new Date(orderDetails.timestamp).toLocaleString()}</p>
                    <p><span class="highlight">Amount:</span> $${orderDetails.amountTotal.toFixed(2)} ${orderDetails.currency.toUpperCase()}</p>
                    <p><span class="highlight">Turnaround Time:</span> ${orderDetails.turnaroundTime}</p>
                    <p><span class="highlight">Language:</span> ${orderDetails.language}</p>
                    <p><span class="highlight">Business Specific:</span> ${orderDetails.businessSpecific}</p>
                    <p><span class="highlight">Translation File:</span> ${orderDetails.translationFileName}</p>
                    <p><span class="highlight">Context File:</span> ${orderDetails.contextFileName}</p>
                </div>

                <div class="order-details">
                    <h2>Customer Information</h2>
                    <p><span class="highlight">Email:</span> ${orderDetails.customerEmail}</p>
                    <p><span class="highlight">Name:</span> ${orderDetails.customerName}</p>
                    <p><span class="highlight">Phone:</span> ${orderDetails.customerPhone}</p>
                </div>

                <p>Please process this order according to the specified requirements.</p>
                <p>For full order details, please check the order_details.json file in Google Drive.</p>

                ${folderLinkSection}
            </div>
        </body>
    </html>
    `;

    try {
        let info = await transporter.sendMail({
            from: '"Typewriters.ai" <' + process.env.EMAIL_USER + '>',
            to: process.env.NOTIFICATION_EMAIL,
            subject: "New Translation Order Received - Typewriters.ai",
            text: `New order received for Typewriters.ai. Order ID: ${orderDetails.stripeSessionId}, Amount: $${orderDetails.amountTotal.toFixed(2)} ${orderDetails.currency.toUpperCase()}, Language: ${orderDetails.language}. ${orderDetails.folderLink ? `View order folder: ${orderDetails.folderLink}` : ''} Please check the HTML version for full details.`,
            html: htmlContent,
        });

        console.log("Order notification email sent successfully");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("Error sending order notification email:", error);
    }
}

exports.handler = async (event, context) => {
    const sig = event.headers["stripe-signature"];
    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log("Stripe event constructed successfully");
    } catch (err) {
        console.error("Error constructing Stripe event:", err);
        return {
            statusCode: 400,
            body: `Webhook Error: ${err.message}`,
        };
    }

    if (stripeEvent.type === "checkout.session.completed") {
        console.log("Checkout session completed event received");
        const session = stripeEvent.data.object;

        // Initialize Google Drive API client
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS.replace(/'/g, '"')),
            scopes: ["https://www.googleapis.com/auth/drive"],
        });
        const drive = google.drive({ version: "v3", auth });
        console.log("Google Drive API client initialized");

        if (session.payment_status === "paid") {
            console.log("Payment status: paid");
            const businessSpecific = session.metadata.businessSpecific;
            const cost = session.amount_total / 100; // Convert from cents to dollars
            const turnaroundTime = session.metadata.turnaroundTime;
            const fileId = session.metadata.fileId;
			const language = session.metadata.language.split(","); // Convert string back to array
			const translationFileName = session.metadata.translationFileName;
            const contextFileName = session.metadata.contextFileName;

            try {
                const folderId = "1jZgmesu0ixGYkOqF2iFsoEhFa30cEPQx"; // Change to google drive folder id containing official files (After the user has successfully paid)

                const folderLink = await moveFolder({
                    drive,
                    folderId: fileId,
                    newParentId: folderId,
                });
                // Store the additional details in a file in Google Drive
                const orderDetails = {
                    businessSpecific,
                    cost,
                    turnaroundTime,
                    language: language.join(","), // Convert array back to string if needed
                    translationFileName, // Add translation file name to order details
                    contextFileName, // Add context file name to order details
                    timestamp: new Date().toISOString(),
                    stripeSessionId: session.id,
                    customerEmail: session.customer_details?.email || 'Not provided',
                    customerName: session.customer_details?.name || 'Not provided',
                    customerPhone: session.customer_details?.phone || 'Not provided',
                    paymentIntent: session.payment_intent,
                    amountSubtotal: session.amount_subtotal / 100,
                    amountTotal: session.amount_total / 100,
                    currency: session.currency,
                    paymentStatus: session.payment_status,
                    customerAddress: session.customer_details?.address || 'Not provided',
                    shippingAddress: session.shipping?.address || 'Not provided',
                    shippingName: session.shipping?.name || 'Not provided',
                    createdAt: new Date(session.created * 1000).toISOString(),
                    expiresAt: new Date(session.expires_at * 1000).toISOString(),
                    paymentMethod: session.payment_method_types.join(', '),
                    subscriptionId: session.subscription || 'Not a subscription',
                    invoiceId: session.invoice || 'No invoice',
                };
                orderDetails.folderLink = folderLink;

                const orderDetailsFileName = "order_details.json";
                const orderDetailsFileMetadata = {
                    name: orderDetailsFileName,
                    parents: [folderId], // Changed from fileId to folderId
                    mimeType: "application/json",
                };
                const orderDetailsFileMedia = {
                    mimeType: "application/json",
                    body: JSON.stringify(orderDetails),
                };
                await drive.files.create({
                    resource: orderDetailsFileMetadata,
                    media: orderDetailsFileMedia,
                    fields: "id",
                });
                console.log("Order details stored in Google Drive");

                // Send email with order details
                await sendOrderEmail(orderDetails);

                return {
                    statusCode: 200,
                    body: "Payment successfully processed, files uploaded to Google Drive, and notification email sent",
                };
            } catch (error) {
                console.error("Error uploading files to Google Drive:", error);
                return {
                    statusCode: 500,
                    body: "Payment processed, but an error occurred while uploading files to Google Drive or sending notification",
                };
            }
        } else {
            console.log("Payment not completed");
            const fileId = session.metadata.fileId;
            // Delete the temporarily stored files
            await deleteFolder({
                drive,
                folderId: fileId,
            });
            return {
                statusCode: 200,
                body: "Payment not completed",
            };
        }
    }

    console.log("Unhandled event type:", stripeEvent.type);
    return {
        statusCode: 400,
        body: `Unhandled event type: ${stripeEvent.type}`,
    };
};
