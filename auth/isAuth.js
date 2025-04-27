const { verify } = require("jsonwebtoken");

function isAuth(authorization) {
  try {
    if (!authorization) {
      return null;
    }

    const token = authorization.trim();
    if (!token) {
      return null;
    }

    const decoded = verify(token, process.env.ACCESS_TOKEN, {
      algorithms: ["HS256"], // Only allow HS256 algorithm
      maxAge: "60m", // Double-check expiration
    });

    // Verify token type and required claims
    if (decoded.type !== "access" || !decoded.userId || !decoded.iat) {
      console.error("Invalid token structure");
      return null;
    }

    return decoded.userId;
  } catch (error) {
    console.error("Error verifying token:", error.message);
    return null;
  }
}

module.exports = isAuth;
