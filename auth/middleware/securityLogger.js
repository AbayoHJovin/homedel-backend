const winston = require("winston");
const path = require("path");

// Create logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Write security events to security.log
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/security.log"),
      level: "info",
    }),
    // Write error events to error.log
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/error.log"),
      level: "error",
    }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

const securityLogger = (req, res, next) => {
  // Log failed login attempts
  const originalStatus = res.statusCode;
  const originalJson = res.json;

  res.json = function (data) {
    if (req.path.includes("/login") && originalStatus === 401) {
      logger.warn("Failed login attempt", {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    }

    // Log other security-related events
    if (originalStatus >= 400) {
      logger.info("Security event", {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        path: req.path,
        method: req.method,
        statusCode: originalStatus,
        timestamp: new Date().toISOString(),
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  securityLogger,
  logger,
};
