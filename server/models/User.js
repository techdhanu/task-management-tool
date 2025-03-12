// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true, // Normalize email to lowercase for consistency
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); // Basic email format validation
      },
      message: props => `${props.value} is not a valid email address`
    },
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  role: { // Optional: Add role for future authorization (e.g., user/admin)
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  preferences: { // Optional: Add for future customization (e.g., theme, notifications)
    type: Map,
    of: String,
    default: {},
  },
}, { timestamps: true });

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10); // Use 10 rounds for performance (<6–7s)
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to compare passwords for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Index for better query performance
userSchema.index({ email: 1 }); // Primary index on email for unique lookups
userSchema.index({ name: 1 }); // Optional index on name for searches

/**
 * User Schema for authentication and authorization
 * @typedef {Object} User
 * @property {string} email - User's email (unique, required, validated)
 * @property {string} password - User's hashed password (required, hashed before save)
 * @property {string} name - User's name (required, trimmed)
 * @property {string} [role] - User's role (user/admin, default: user)
 * @property {Map<string, string>} [preferences] - User preferences (e.g., theme)
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

const User = mongoose.model('User', userSchema);

module.exports = User;