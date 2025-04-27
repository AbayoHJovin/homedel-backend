const express = require("express");
const { getPaymentStatus, requestToPay, initializeKeys } = require("../MtnPayment");

const router = express.Router();
router.post("/request-to-pay",initializeKeys, requestToPay);
router.get("/payment-status/:referenceId", getPaymentStatus);

module.exports = router;
