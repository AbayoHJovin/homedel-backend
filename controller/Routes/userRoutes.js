const express = require("express");
const multer = require('multer');
require("dotenv").config()
const cloudinary = require("cloudinary").v2;
const {
  signupUser,
  loginUser,
  getUserDetails,
  updateUserDetails,
  logOut,
  getCurrentUser,
  forgotPassword,
  checkOldPassword,
  updatePassword,
  checkUserEmail,
} = require("../userControllers");

cloudinary.config({
  cloud_name:process.env.CLOUD_NAME ,
  api_key:process.env.CLOUD_API_KEY ,
  api_secret:process.env.CLOUD_SECRET_KEY,
});
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const router = express.Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.get("/users", getUserDetails);
router.patch("/user/update",upload.single('image'), updateUserDetails);
router.post("/logout", logOut);
router.get("/currentUser", getCurrentUser);
router.post("/check-email", checkUserEmail);
router.patch("/forgotPass", forgotPassword);
router.get("/checkPassword", checkOldPassword);
router.patch("/updatePassword", updatePassword);

module.exports = router;
