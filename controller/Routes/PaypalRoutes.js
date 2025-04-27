const express = require('express');
const { createOrder, captureOrder, getPayPalConfig } = require('../PaypalController');
const router = express.Router();

router.post('/create-order', createOrder);
router.post('/capture-order', captureOrder);
router.get('/config/paypal', getPayPalConfig);

module.exports = router;
