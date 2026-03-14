module.exports = (requiredRole, requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: "User account is inactive"
      });
    }

    if (requiredRole && req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: "Access denied - insufficient role"
      });
    }

    if (requiredPermission && !req.user.permissions[requiredPermission]) {
      return res.status(403).json({
        success: false,
        message: "Access denied - insufficient permissions"
      });
    }

    next();
  };
};