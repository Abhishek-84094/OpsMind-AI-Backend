const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const documentRoutes = require("./routes/documentRoutes");
const errorHandler = require("./middleware/errorHandler");
const {
  validateInput,
  cspHeaders,
  mongoSanitize
} = require("./middleware/securityMiddleware");

const app = express();
const rateLimiter = require("./middleware/rateLimiter");

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: "deny" },
  noSniff: true,
  xssFilter: true
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(morgan("combined"));

// Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Security: Input validation
app.use(validateInput);
app.use(cspHeaders);

// Rate limiting
app.use("/api/query", rateLimiter);
app.use("/api/auth/login", rateLimiter);
app.use("/api/auth/register", rateLimiter);

// Routes
const queryRoutes = require("./routes/queryRoutes");
app.use("/api/query", queryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/documents", documentRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 OpsMind AI Backend Running"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
