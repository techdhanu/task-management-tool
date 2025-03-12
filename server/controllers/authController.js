// server/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Optional: For token blacklisting (not implemented here, but noted for future)
const TokenBlacklist = require('../models/TokenBlacklist'); // Create this model if needed

const register = async (req, res) => {
  console.log('Registration attempt from IP:', req.ip, 'with body:', req.body);

  try {
    const { email, password, name } = req.body;

    // Basic input validation (complementing express-validator in authRoutes)
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields (email, password, name) are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ message: 'Name must be between 2 and 50 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10); // Use 10 rounds for performance (<6–7s)
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      email,
      password: hashedPassword,
      name,
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const startTime = Date.now();
    // Return success response
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
      },
    });
    const endTime = Date.now();
    console.log(`Registration completed in ${endTime - startTime}ms for user ${email}`);
  } catch (error) {
    console.error('Registration error for user', email, ':', error.stack);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

const login = async (req, res) => {
  console.log('Login attempt from IP:', req.ip, 'with body:', req.body);

  try {
    const { email, password } = req.body;

    // Basic input validation (complementing express-validator in authRoutes)
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password); // Use method from User.js
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const startTime = Date.now();
    // Return success response
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
    const endTime = Date.now();
    console.log(`Login completed in ${endTime - startTime}ms for user ${email}`);
  } catch (error) {
    console.error('Login error for user', email, ':', error.stack);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

const logout = async (req, res) => {
  console.log('Logout attempt from IP:', req.ip, 'with token:', req.headers.authorization);

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expect "Bearer <token>"

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Optional: Blacklist token (not implemented here, but noted for production)
    // await TokenBlacklist.create({ token, expiresAt: new Date(Date.now() + 3600000) }); // 1 hour

    const startTime = Date.now();
    res.status(200).json({ message: 'Logged out successfully' });
    const endTime = Date.now();
    console.log(`Logout completed in ${endTime - startTime}ms`);
  } catch (error) {
    console.error('Logout error:', error.stack);
    res.status(500).json({ message: 'Server error during logout', error: error.message });
  }
};

module.exports = { register, login, logout };