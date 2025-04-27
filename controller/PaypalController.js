const axios = require("axios");
const dotenv = require("dotenv");
const changeFormatAndPushToCloudinary = require("./functions/changeFormat");
dotenv.config();

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
  const { amount } = req.body;

  try {
    const accessToken = await getPayPalAccessToken();

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount,
          },
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
      res.json({
        success: true,
        paymentType: "PayPal",
        data: response.data,
        cloudinaryResult: result,
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
