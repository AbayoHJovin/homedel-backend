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

function sendAccessToken(req, res, accessToken, isAdmin, safeUser) {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    path: "/",
    maxAge: 1000 * 60 * 60, // 1 hour
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production"
  });

  res.status(200).json({
    accessToken,
    message: "loggedIn",
    isAdmin,
    expiresIn: 3600,
    user: safeUser,
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
function extractUserId(token) {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN, { algorithms: ["HS256"] });
    return decoded.userId;
}
function extractAdminStatus(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    return decoded.isAdmin;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  sendAccessToken,
  sendRefreshToken,
  extractUserId,
  extractAdminStatus
};
