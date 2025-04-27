

const express = require("express");
const multer = require("multer");
require("dotenv").config();
const {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  makeAPopularProduct,
  getpopularProducts,
} = require("../productControllers");

const router = express.Router();

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.post("/addProduct", upload.array("images", 10), addProduct); // Allow up to 10 images
router.get("/products", getProducts);
router.patch("/products/:prodId", upload.array("images", 10), updateProduct); // Allow up to 10 images
router.delete("/products/:id", deleteProduct);
router.patch("/makeAPopularProduct", makeAPopularProduct);
router.get("/getPopularProducts", getpopularProducts);

module.exports = router;