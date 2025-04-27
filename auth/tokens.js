const jwt = require("jsonwebtoken");
require("dotenv").config();

function createAccessToken(userId) {
  return jwt.sign(
    {
      userId,
      type: "access",
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.ACCESS_TOKEN,
    {
      expiresIn: "60m",
      algorithm: "HS256", // Explicitly set algorithm
    }
  );
}

function createRefreshToken(userId) {
  return jwt.sign(
    {
      userId,
      type: "refresh",
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.REFRESH_TOKEN,
    {
      expiresIn: "7d",
      algorithm: "HS256", // Explicitly set algorithm
    }
  );
}

function sendAccessToken(req, res, accessToken, isAdmin) {
  res.status(200).json({
    accessToken,
    message: "loggedIn",
    isAdmin,
    expiresIn: 3600, // 60 minutes in seconds
  });
}

function sendRefreshToken(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    path: "/refresh_token",
    secure: process.env.NODE_ENV === "production", // Ensures HTTPS in production
    // sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax", // Strict in production, Lax in development
    // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    // domain: process.env.COOKIE_DOMAIN || undefined, // Restrict to specific domain
  });
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  sendAccessToken,
  sendRefreshToken,
};
