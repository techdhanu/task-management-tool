// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { check, validationResult } = require('express-validator'); // For input validation
const rateLimit = require('express-rate-limit'); // For rate limiting
require('dotenv').config();

// Rate limiting middleware (5 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again later' }
});

// Validation middleware for registration
const registerValidation = [
  check('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
  check('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
  check('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
];

// Validation middleware for login
const loginValidation = [
  check('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
  check('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required'),
];

// Register endpoint
router.post('/register', limiter, registerValidation, async (req, res) => {
  console.log('Registration attempt from IP:', req.ip, 'with body:', req.body);

  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
  }

  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user (password will be hashed by User model pre-save middleware)
    const user = new User({
      name,
      email,
      password,
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    const startTime = Date.now();
    // Return success response
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
    const endTime = Date.now();
    console.log(`Registration completed in ${endTime - startTime}ms for user ${email}`);
  } catch (error) {
    console.error('Registration error for user', email, ':', error.stack);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login endpoint
router.post('/login', limiter, loginValidation, async (req, res) => {
  console.log('Login attempt from IP:', req.ip, 'with body:', req.body);

  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    const startTime = Date.now();
    // Return success response
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
    const endTime = Date.now();
    console.log(`Login completed in ${endTime - startTime}ms for user ${email}`);
  } catch (error) {
    console.error('Login error for user', email, ':', error.stack);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Logout endpoint (client-side handled, server-side acknowledgment)
router.post('/logout', (req, res) => {
  console.log('Logout attempt from IP:', req.ip, 'with token:', req.headers.authorization);
  // For JWT, logout is handled client-side by clearing the token
  // Server-side can invalidate or blacklist tokens (optional for production)
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;