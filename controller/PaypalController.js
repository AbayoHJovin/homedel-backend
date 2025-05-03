const axios = require("axios");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const changeFormatAndPushToCloudinary = require("./functions/changeFormat");

dotenv.config();
const prisma = new PrismaClient();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = process.env.PAYPAL_API_URL;

// Utility function to get PayPal access token
const getPayPalAccessToken = async () => {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const response = await axios.post(
    `${PAYPAL_API_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return response.data.access_token;
};

exports.createOrder = async (req, res) => {
  const { amount, orderId } = req.body;

  try {
    if (!amount || !orderId) {
      return res.status(400).json({
        success: false,
        error: "Please provide amount and orderId",
      });
    }

    // Check if order exists and get its details
    const order = await prisma.orders.findUnique({
      where: { orderId },
      include: {
        transaction: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error:
          "Order not found. Cannot process payment for non-existent order.",
      });
    }

    // Check if transaction already exists
    if (order.transaction ) {
      return res.status(400).json({
        success: false,
        error: "This order already has a transaction.",
      });
    }

    // Validate stock availability before payment
    for (const item of order.orderItems) {
      const product = item.product;
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Not enough stock for product: ${product.prodName}. Available: ${product.stock}`,
        });
      }
    }

    const accessToken = await getPayPalAccessToken();

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount,
          },
          custom_id: orderId, // Store orderId in PayPal order for reference
        },
      ],
      application_context: {
        return_url: "http://localhost:3000/success",
        cancel_url: "http://localhost:3000/cancel",
      },
    };

    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders`,
      orderPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({ success: true, orderId: response.data.id });
  } catch (error) {
    console.error(
      "Error creating order:",
      error.response?.data || error.message
    );
    res.status(500).json({ success: false, message: "Error creating order" });
  }
};

// Controller to capture a PayPal order
exports.captureOrder = async (req, res) => {
  const { orderId } = req.body;

  try {
    const accessToken = await getPayPalAccessToken();

    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.status === "COMPLETED") {
      const result = await changeFormatAndPushToCloudinary(
        response.data,
        "Payment Details"
      );

      // Get the original order ID from PayPal's custom_id
      const originalOrderId = response.data.purchase_units[0].custom_id;

      // Create transaction record and update order status
      const transaction = await prisma.$transaction(async (prisma) => {
        // Create transaction
        const newTransaction = await prisma.orderTransaction.create({
          data: {
            orderId: originalOrderId,
            phoneNo: response.data.payer.phone_number || "N/A",
            amount: response.data.purchase_units[0].amount.value,
            transactionUrl: result.secure_url,
            paymentMethod: "PayPal",
          },
        });

        // Get order details
        const order = await prisma.orders.findUnique({
          where: { orderId: originalOrderId },
          include: { orderItems: true },
        });

        // Update order payment status
        await prisma.orders.update({
          where: { orderId: originalOrderId },
          data: {
            paymentStatus: "PAID",
            orderStatus: "DELIVERING",
          },
        });

        // Reduce stock for each product
        for (const item of order.orderItems) {
          await prisma.products.update({
            where: { prodId: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        return newTransaction;
      });

      res.json({
        success: true,
        paymentType: "PayPal",
        data: response.data,
        cloudinaryResult: result,
        transaction: transaction,
      });
    } else {
      res.status(400).json({ success: false, message: "Payment failed" });
    }
  } catch (error) {
    console.error(
      "Error capturing order:",
      error.response?.data || error.message
    );
    res
      .status(500)
      .json({ success: false, message: "Error capturing payment" });
  }
};

exports.getPayPalConfig = (req, res) => {
  res.json({ clientId: PAYPAL_CLIENT_ID });
};
