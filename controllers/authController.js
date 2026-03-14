const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const logger = require("../utils/logger");

const ADMIN_CODE = process.env.ADMIN_CODE || "ADMIN123";

// ================= REGISTER =================
exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role = "employee" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Validate role
    const validRoles = ["employee", "viewer", "admin"];
    const userRole = validRoles.includes(role) ? role : "employee";

    // Set permissions based on role
    let permissions = {};
    switch (userRole) {
      case "admin":
        permissions = {
          canUpload: true,
          canQuery: true,
          canViewAnalytics: true,
          canManageUsers: true,
          canDeleteDocuments: true,
        };
        break;
      case "employee":
        permissions = {
          canUpload: true,
          canQuery: true,
          canViewAnalytics: false,
          canManageUsers: false,
          canDeleteDocuments: false,
        };
        break;
      case "viewer":
        permissions = {
          canUpload: false,
          canQuery: true,
          canViewAnalytics: false,
          canManageUsers: false,
          canDeleteDocuments: false,
        };
        break;
      default:
        permissions = {
          canUpload: true,
          canQuery: true,
          canViewAnalytics: false,
          canManageUsers: false,
          canDeleteDocuments: false,
        };
    }

    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      permissions,
    });

    logger.info(`User registered: ${user.email}, Role: ${userRole}`);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token: generateToken(user._id),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    next(error);
  }
};

// ================= LOGIN =================
exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      logger.warn(`Failed login attempt for user: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    logger.info(`User logged in: ${user.email}, Role: ${user.role}`);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token: generateToken(user._id),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

// ================= GET CURRENT USER =================
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logger.error(`Get current user error: ${error.message}`);
    next(error);
  }
};
