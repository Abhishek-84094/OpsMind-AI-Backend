const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "employee", "viewer"],
      default: "employee",
    },

    permissions: {
      canUpload: { type: Boolean, default: true },
      canQuery: { type: Boolean, default: true },
      canViewAnalytics: { type: Boolean, default: false },
      canManageUsers: { type: Boolean, default: false },
      canDeleteDocuments: { type: Boolean, default: false },
    },

    accessibleDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document"
    }],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);