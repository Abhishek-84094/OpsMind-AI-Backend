const mongoSanitize = require("express-mongo-sanitize");

// Input validation middleware
const validateInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === "string") {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

// Rate limiting per user
const userRateLimiter = require("express-rate-limit");

const createUserLimiter = (windowMs, max) => {
  return userRateLimiter({
    windowMs,
    max,
    keyGenerator: (req) => req.user?._id || req.ip,
    message: "Too many requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false
  });
};

// CSP Headers
const cspHeaders = (req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:"
  );
  next();
};

module.exports = {
  validateInput,
  createUserLimiter,
  cspHeaders,
  mongoSanitize
};
