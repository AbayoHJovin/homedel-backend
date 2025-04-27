const bcrypt = require("bcrypt");
const lodash = require("lodash");
const crypto = require('crypto');
const axios = require("axios");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");
const cloudinary= require("cloudinary").v2
const {
  createAccessToken,
  createRefreshToken,
  sendAccessToken,
  sendRefreshToken,
} = require("../auth/tokens");
const isAuth = require("../auth/isAuth");
require("dotenv").config();
const prisma = new PrismaClient();
exports.signupUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
      throw new Error("Missing credentials");
    }
    const existingUser = await prisma.users.findFirst({
      where: { email: email },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 5);
    const saveUser = await prisma.users.create({
      data: { username: username, email: email, password: hashedPassword },
    });
    res
      .status(201)
      .json({ success: true, message: "User created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  let isAdmin = false;
  try {
    const user = await prisma.users.findFirst({ where: { email: email } });
    if (!user) {
      return res.status(400).json({ message: "invalid credentials" });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "invalid credentials" });
    }
    if (user.email === process.env.AD_EMAIL) {
      isAdmin = true;
    }
    const accessToken = createAccessToken(user.userId);
    const refreshToken = createRefreshToken(user.userId);
    user.refreshToken = refreshToken;
    sendRefreshToken(res, refreshToken);
    sendAccessToken(req, res, accessToken, isAdmin);
    return;
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = await prisma.users.findMany();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

const streamifier = require("streamifier"); 

exports.updateUserDetails = async (req, res) => {
  const userId = req.body.userId;
  const { username, email } = req.body;

  try {
    if (!username || !email) {
      throw new Error("Please provide both username and email");
    }

    let profilePictureUrl = null;

    if (req.file) {
      profilePictureUrl = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "profile_pictures" }, 
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url); 
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    }

    const updatedUser = await prisma.users.update({
      where: { userId },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(profilePictureUrl && { profilePicture: profilePictureUrl }),
      },
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  const token = req.headers.token;
  let isAdmin = false;
  try {
    const userId = isAuth(token);

    if (!userId) {
      return res.json({ user: null });
    }
    const currentUserCredentials = await prisma.users.findUnique({
      where: { userId },
    });
    if (!currentUserCredentials) {
      throw new Error("No user is found");
    }
    if (currentUserCredentials.email === process.env.AD_EMAIL) {
      isAdmin = true;
    }
    const currentUser = lodash.omit(currentUserCredentials, ["password"]);
    return res.status(200).json({ user: currentUser, isAdmin: isAdmin });
  } catch (e) {
    console.log(e);
    return res.status(401).json({ error: e.message || "Something went wrong" });
  }
};

exports.logOut = (req, res) => {
  res.clearCookie("refreshToken", { path: "/refresh_token" });
  return res.send({ message: "Logged out" });
};

exports.checkUserEmail = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.users.findFirst({
      where: { email: email },
    });

    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Email verified" 
    });
  } catch (error) {
    return res.status(500).json({ 
      message: "Error checking email" 
    });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.users.findFirst({
      where: { email: email },
    });

    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour validity

    // Update user with reset token
    await prisma.users.update({
      where: { 
        email: email // Using email since it's @unique
      },
      data: {
        resetToken: resetToken,
        resetTokenExpiry: resetTokenExpiry
      }
    });

    const resetUrl = `https://homedel-jov.vercel.app/update-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    const cancelUrl = `https://homedel-jov.vercel.app/cancel-reset?token=${resetToken}`;

    // Email configuration
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.COMPANY_EMAIL,
        pass: process.env.COMPANY_PASSWORD,
      },
    });

    // Send email
    await transporter.sendMail({
      from: process.env.COMPANY_EMAIL,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h2 style="text-align: center; color: #22c55e;">Password Reset Request</h2>
            <p>Hello ${user.username},</p>
            <p>We received a request to reset your password. If this wasn't you, please click "This is not me" to secure your account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 0 10px;">
                Change Password
              </a>
              <a href="${cancelUrl}" 
                 style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 0 10px;">
                This is not me
              </a>
            </div>
            
            <p>If you didn't request this, please ignore this email and make sure your account is secure.</p>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              This link will expire in 1 hour for security reasons.
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ 
      message: "Password reset instructions sent to your email" 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      message: "Failed to send reset instructions" 
    });
  }
};

exports.checkOldPassword = async (req, res) => {
  const { email, password } = req.headers;
  try {
    if (!email || !password) {
      return res.status(401).json({ message: "Missing values" });
    }
    const user = await prisma.users.findFirst({ where: { email: email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    return res.status(200).json({ message: "Password is valid" });
  } catch (e) {
    return res.status(401).json({ error: e.message || "Something went wrong" });
  }
};

exports.updatePassword = async (req, res) => {
  const { token, email, newPassword } = req.body;

  try {
    const user = await prisma.users.findFirst({
      where: {
        email,
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date() // Check if token hasn't expired
        }
      }
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired reset token" 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { 
        email: email 
      },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return res.status(200).json({ 
      message: "Password updated successfully" 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      message: "Error updating password" 
    });
  }
};
