const express = require("express");
const { addCartItem, getCartItem, deleteCartItem, deleteAllCartItems, updateCartItemsQuantity } = require("../cartControllers");
const router = express.Router();
router.post("/addItemOncart", addCartItem);
router.get("/getCartItems",getCartItem)
router.delete("/deleteCartItem",deleteCartItem)
router.delete("/deleteAllCartItems",deleteAllCartItems)
router.post("/updateCart",updateCartItemsQuantity)
module.exports = router;
