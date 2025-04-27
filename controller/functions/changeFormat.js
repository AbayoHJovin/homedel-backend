// Import required modules
const cloudinary = require("cloudinary").v2;
const { createCanvas } = require("canvas");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

/**
 * Transforms the success response data from various payment APIs into an image and uploads it to Cloudinary.
 * @param {Object} data - The success response data from the payment API.
 * @param {string} paymentType - The type of payment (e.g., "MTN", "PayPal", "Card").
 * @returns {Promise<Object>} - The result from Cloudinary or an error object.
 */
const changeFormatAndPushToCloudinary = async (data, paymentType) => {
  try {
    let transformedData;

    // Transform the data based on the payment type
    if (paymentType === "MTN") {
      transformedData = {
        paidWith: "MTN MoMo",
        amount: new Intl.NumberFormat("en-US").format(data.amount),
        currency: data.currency,
        status: data.status,
        payer: data.payer.partyId,
        payerMessage: data.payerMessage,
        payeeNote: data.payeeNote,
      };
    } else if (paymentType === "PayPal" || paymentType === "Card") {
      transformedData = {
        paidWith: paymentType,
        transactionId: data.id || data.transaction_id,
        amount: data.amount.total || data.amount,
        currency: data.amount.currency || data.currency,
        status: data.state || data.status,
        payer: data.payer.email || data.payer_info.email,
        payerMessage: data.payer_message || "Payment successful.",
        payeeNote: data.payee_note || "Thank you for your transaction.",
      };
    } else {
      throw new Error("Unsupported payment type");
    }

    // Enhanced canvas styling
    const canvas = createCanvas(800, 1000);
    const ctx = canvas.getContext("2d");

    // Background with subtle gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#f8f9fa");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header with logo and company name
    ctx.fillStyle = "#28a745";
    ctx.fillRect(0, 0, canvas.width, 120);
    
    // Add company logo or icon
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Payment Receipt", canvas.width / 2, 50);
    ctx.font = "20px Arial";
    ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, 80);

    // Receipt content with improved styling
    ctx.fillStyle = "#000000";
    ctx.font = "18px Arial";
    ctx.textAlign = "left";

    let y = 180;
    const leftMargin = 50;
    const labelWidth = 200;

    // Add decorative line
    ctx.strokeStyle = "#e0e0e0";
    ctx.beginPath();
    ctx.moveTo(leftMargin, y - 30);
    ctx.lineTo(canvas.width - leftMargin, y - 30);
    ctx.stroke();

    // Content with improved layout
    for (const [key, value] of Object.entries(transformedData)) {
      // Label background
      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(leftMargin - 10, y - 25, labelWidth, 35);
      
      // Label
      ctx.fillStyle = "#28a745";
      ctx.font = "bold 18px Arial";
      ctx.fillText(
        `${key.charAt(0).toUpperCase() + key.slice(1)}:`,
        leftMargin,
        y
      );

      // Value
      ctx.fillStyle = "#000000";
      ctx.font = "18px Arial";
      ctx.fillText(`${value}`, leftMargin + labelWidth + 20, y);

      y += 50;
    }

    // Add QR Code placeholder
    ctx.strokeStyle = "#28a745";
    ctx.strokeRect(canvas.width - 150, canvas.height - 150, 100, 100);
    ctx.font = "14px Arial";
    ctx.fillStyle = "#666666";
    ctx.textAlign = "center";
    ctx.fillText("Scan for", canvas.width - 100, canvas.height - 170);
    ctx.fillText("verification", canvas.width - 100, canvas.height - 155);

    // Footer
    const footerY = canvas.height - 50;
    ctx.fillStyle = "#28a745";
    ctx.fillRect(0, footerY, canvas.width, 50);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "Thank you for your business!",
      canvas.width / 2,
      footerY + 30
    );

    // Convert the canvas to a buffer
    const buffer = canvas.toBuffer("image/png");

    // Upload the image to Cloudinary
    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: `${paymentType.toLowerCase()}-payments`,
          public_id:
            transformedData.transactionId || transformedData.payer || "receipt",
        },
        (error, result) => {
          if (error) {
            console.error("Error uploading to Cloudinary:", error);
            reject(new Error("Failed to upload to Cloudinary"));
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    console.log("uploadResponse", uploadResponse);
    return uploadResponse;
  } catch (error) {
    console.error("Error in changeFormatAndPushToCloudinary:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = changeFormatAndPushToCloudinary;
