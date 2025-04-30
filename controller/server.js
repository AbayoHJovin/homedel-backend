const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const userRoutes = require("./Routes/userRoutes");
const cookieParser = require("cookie-parser");
const productRoutes = require("./Routes/productRoutes");
const cartRoutes = require("./Routes/cartRoutes");
const tokenRoutes = require("./Routes/tokenRoutes");
const offerRoutes = require("./Routes/offerRoutes");
const otpRoutes = require("./Routes/otpRoutes");
const subscriptionRoutes = require("./Routes/subscriptions");
const Paypal = require("./Routes/PaypalRoutes");
require("dotenv").config();
const Mtn = require("./Routes/MTNRoutes");
const prisma = require("./prisma");

// Import security middleware
const {
  basicHeaders,
  addCustomHeaders,
} = require("../auth/middleware/securityHeaders");
const {
  loginLimiter,
  refreshTokenLimiter,
  apiLimiter,
} = require("../auth/middleware/rateLimiter");
const { securityLogger } = require("../auth/middleware/securityLogger");
const xssClean = require("xss-clean");

const app = express();

// Apply security middleware
app.use(basicHeaders); // Apply Helmet security headers
app.use(addCustomHeaders); // Apply custom security headers
app.use(xssClean()); // Sanitize input
app.use(securityLogger); // Log security events

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "10kb" })); // Limit JSON body size

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://homedel-jov.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "token","popularity"],
};

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10kb" })); // Limit JSON body size

// Apply rate limiting to specific routes
app.use("/api/login", loginLimiter);
app.use("/api/refresh_token", refreshTokenLimiter);
app.use("/api", apiLimiter); // General API rate limiting

app.listen(5000, async () => {
  try {
    // Test the database connection
    await prisma.$connect();
    console.log("Database connection established successfully");
    console.log("Server is running on port 5000");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
});

// Apply routes after security middleware
app.use(userRoutes);
app.use(productRoutes);
app.use(tokenRoutes);
app.use(cartRoutes);
app.use(offerRoutes);
app.use(otpRoutes);
app.use(subscriptionRoutes);
app.use(Paypal);
app.use(Mtn);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});
