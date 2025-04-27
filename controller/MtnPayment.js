const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const changeFormatAndPushToCloudinary = require("./functions/changeFormat");

dotenv.config();

const subscriptionKey = process.env.SUBSCRIPTION_KEY;
const callbackHost = process.env.CALLBACK_URL;

if (!subscriptionKey) {
  throw new Error(
    "Error: SUBSCRIPTION_KEY is missing in environment variables."
  );
}

let userId = null;
let apiKey = null;
let accessToken = null;
let isInitialized = false; // Tracks initialization status
let initializationError = null; // Tracks initialization errors

// Register API User
const registerApiUser = async () => {
  try {
    userId = uuidv4();
    const payload = { providerCallbackHost: callbackHost };
    const headers = {
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      "Content-Type": "application/json",
      "X-Reference-Id": userId,
    };
    await axios.post(
      "https://sandbox.momodeveloper.mtn.com/v1_0/apiuser",
      payload,
      { headers }
    );
    console.log(`API User registered successfully. User ID: ${userId}`);
  } catch (error) {
    throw new Error(
      `Error registering API user: ${error.response?.data || error.message}`
    );
  }
};

// Generate API Key
const generateApiKey = async () => {
  try {
    const headers = { "Ocp-Apim-Subscription-Key": subscriptionKey };
    const response = await axios.post(
      `https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/${userId}/apikey`,
      {},
      { headers }
    );
    apiKey = response.data.apiKey;
    console.log(`API Key generated.`);
  } catch (error) {
    throw new Error(
      `Error generating API Key: ${error.response?.data || error.message}`
    );
  }
};

// Fetch Access Token
const fetchAccessToken = async () => {
  try {
    const headers = {
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      Authorization: `Basic ${Buffer.from(`${userId}:${apiKey}`).toString(
        "base64"
      )}`,
    };
    const response = await axios.post(
      "https://sandbox.momodeveloper.mtn.com/collection/token/",
      "grant_type=client_credentials",
      { headers }
    );
    accessToken = response.data.access_token;
    console.log(`Access Token retrieved.`);
  } catch (error) {
    throw new Error(
      `Error fetching access token: ${error.response?.data || error.message}`
    );
  }
};

// Initialize Keys
const initializeKeys = async (req, res, next) => {
  try {
    console.log("Initializing MTN API setup...");
    await registerApiUser();
    await generateApiKey();
    await fetchAccessToken();
    isInitialized = true;
    initializationError = null; // Clear any previous error
    console.log("MTN API setup completed successfully.");
    next();
  } catch (error) {
    isInitialized = false;
    initializationError = error.message; // Store the error
    console.error("Failed to initialize MTN API setup:", error.message);
  }
};

const requestToPay = async (req, res) => {
  if (!isInitialized) {
    return res.status(500).json({
      success: false,
      error:
        initializationError ||
        "MTN API is not initialized. Please try again later.",
    });
  }

  try {
    const { amount, phoneNumber } = req.body;
    if (!amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Please provide amount and phoneNumber",
      });
    }
    const xReferenceId = uuidv4();
    const payload = {
      amount,
      currency: "EUR",
      externalId: Math.random().toString(36).substr(2, 9),
      payer: { partyIdType: "MSISDN", partyId: phoneNumber },
      payerMessage: "Payment request sent successfully!",
      payeeNote: "Thanks for your transaction.",
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      "X-Target-Environment": "sandbox",
      "X-Reference-Id": xReferenceId,
      "Content-Type": "application/json",
    };

    const response = await axios.post(
      "https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay",
      payload,
      { headers }
    );
    if (response.status === 202) {
      console.log("Request accepted. Querying payment status...");
      let statusResponse; // Declare the variable outside the if block
      try {
        statusResponse = await axios.get(
          `https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/${xReferenceId}`,
          { headers }
        );
      } catch (statusError) {
        console.error("Error querying payment status:", statusError.message);
        return res.status(500).json({
          success: false,
          error: statusError.response?.data || statusError.message,
        });
      }
      const result = await changeFormatAndPushToCloudinary(
        statusResponse?.data,
        "MTN"
      );
      res.json({
        success: true,
        paymentType: "MTN",
        data: result.secure_url,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Request-to-Pay initiation failed.",
        response: response.data,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

const getPaymentStatus = async (req, res) => {
  if (!isInitialized) {
    return res.status(500).json({
      success: false,
      error:
        initializationError ||
        "MTN API is not initialized. Please try again later.",
    });
  }

  try {
    const { referenceId } = req.params;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      "X-Target-Environment": "sandbox",
    };

    const response = await axios.get(
      `https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/${referenceId}`,
      { headers }
    );

    res.json({
      success: true,
      status: response.data.status, // SUCCESSFUL, FAILED, PENDING
      data: response.data,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: error.response?.data || error.message });
  }
};

// Export Functions
module.exports = { initializeKeys, requestToPay, getPaymentStatus };
