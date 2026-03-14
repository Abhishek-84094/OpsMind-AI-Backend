// App Constants
module.exports = {
  // Roles
  ROLES: {
    ADMIN: "admin",
    EMPLOYEE: "employee",
    VIEWER: "viewer",
  },

  // Permissions
  PERMISSIONS: {
    CAN_UPLOAD: "canUpload",
    CAN_QUERY: "canQuery",
    CAN_VIEW_ANALYTICS: "canViewAnalytics",
    CAN_MANAGE_USERS: "canManageUsers",
    CAN_DELETE_DOCUMENTS: "canDeleteDocuments",
  },

  // Document Status
  DOC_STATUS: {
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
  },

  // Error Messages
  ERRORS: {
    UNAUTHORIZED: "Not authorized",
    FORBIDDEN: "Access denied",
    NOT_FOUND: "Resource not found",
    INVALID_INPUT: "Invalid input",
    SERVER_ERROR: "Server error",
    DUPLICATE_EMAIL: "Email already exists",
    INVALID_CREDENTIALS: "Invalid credentials",
  },

  // Success Messages
  SUCCESS: {
    REGISTERED: "User registered successfully",
    LOGGED_IN: "Login successful",
    DOCUMENT_UPLOADED: "Document uploaded successfully",
    QUERY_ANSWERED: "Query answered successfully",
  },

  // Limits
  LIMITS: {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_CHUNK_SIZE: 500,
    CHUNK_OVERLAP: 50,
    MAX_RESULTS: 5,
    SIMILARITY_THRESHOLD: 0.75,
  },

  // Cache
  CACHE: {
    QUERY_TTL: 3600, // 1 hour
    USER_TTL: 1800, // 30 minutes
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
};
