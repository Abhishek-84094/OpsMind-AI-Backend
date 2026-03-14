module.exports = (requiredRole, requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    // Check if user is active (default true)
    if (req.user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "User account is inactive"
      });
    }

    // Check role if required
    if (requiredRole && req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: "Access denied - insufficient role"
      });
    }

    // Check permission if required
    if (requiredPermission) {
      // If permissions object doesn't exist, allow access (backward compatibility)
      if (!req.user.permissions) {
        return next();
      }
      
      if (!req.user.permissions[requiredPermission]) {
        return res.status(403).json({
          success: false,
          message: "Access denied - insufficient permissions"
        });
      }
    }

    next();
  };
};