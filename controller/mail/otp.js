const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
// const { sendOtpToken } = require("../../auth/tokens");
require("dotenv").config();
const {PrismaClient} =require("@prisma/client")
const prisma=new PrismaClient()

exports.generateOtp = async (req, res) => {
  const otp = otpGenerator.generate(6, {
    digits: true,
    alphabets: false,
    upperCase: false,
    specialChars: false,
  });

  try {
    // Clear any existing OTP first
    await prisma.users.updateMany({
      where: { 
        email: process.env.AD_EMAIL,
        otp: { not: null }
      },
      data: { otp: null }
    });

    // Set new OTP
    await prisma.users.update({
      where: { email: process.env.AD_EMAIL },
      data: { otp: otp },
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.COMPANY_EMAIL,
        pass: process.env.COMPANY_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.COMPANY_EMAIL,
      to: process.env.AD_EMAIL,
      subject: "OTP Verification",
      text: `Your OTP for verification is: ${otp}`,
    });

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "Error sending OTP" });
  }
};

exports.verifyOtp = async (req, res) => {
  const { otp } = req.body;

  try {
    const otpRecord = await prisma.users.findFirst({
      where: { 
        otp: otp,
        email: process.env.AD_EMAIL 
      }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await prisma.users.update({
      where: { email: process.env.AD_EMAIL },
      data: { otp: null }
    });

    const token = jwt.sign({ isAdmin: true }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("adminAuth", token, {
      httpOnly: true,
      path: "/",
      maxAge: 1000 * 60 * 60,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return res.status(200).json({ 
      success: true,
      redirectUrl: "/authorized/Admin/dashboard"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error verifying OTP" });
  }
};

exports.resendOtpCookie = async (req, res) => {
  const adminAuth = req.cookies.adminAuth;

  try {
    if (!adminAuth) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(adminAuth, process.env.JWT_SECRET);
    const newToken = jwt.sign(
      { isAdmin: decoded.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("adminAuth", newToken, {
      httpOnly: true,
      path: "/",
      maxAge: 1000 * 60 * 60,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return res.status(200).json({ message: "Token refreshed successfully" });
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

exports.checkAdmin = async (req, res) => {
  const adminAuth = req.cookies.adminAuth;
  
  try {
    if (!adminAuth) {
      return res.status(401).json({ isAdmin: false, message: "Unauthorized", cookie: req.cookies });
    }

    jwt.verify(adminAuth, process.env.JWT_SECRET);
    return res.status(200).json({ isAdmin: true,cookie: req.cookies  });
  } catch (e) {
    return res.status(401).json({ isAdmin: false, message: "Invalid token" });
  }
};

exports.logOut = (req, res) => {
  res.clearCookie("adminAuth", { 
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return res.status(200).json({ message: "Logged out successfully" });
};
