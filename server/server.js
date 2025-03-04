const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const taskRoutes = require('./routes/taskroutes');
const authRoutes = require('./routes/authRoutes');
const aiServices = require('./services/aiservices');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Allow React dev server
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // If using cookies or auth tokens
}));
app.use(express.json());
app.use(helmet()); // Security middleware

// MongoDB connection (remove deprecated options)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Listen for MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});
mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
});

// Load AI models at server startup
aiServices.loadModels()
    .then(() => console.log('AI models loaded successfully'))
    .catch(err => console.error('Error loading AI models:', err));

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);

// AI model status endpoint
app.get('/api/ai/status', (req, res) => {
    const isModelsLoaded = Object.values(aiServices.modelCache).some(model => model?.model !== null);
    res.json({ modelsLoaded: isModelsLoaded });
});

// Error handling middleware for uncaught exceptions
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

// Graceful shutdown handler using Promises
function shutdown() {
    console.log('Gracefully shutting down...');
    mongoose.connection.close()
        .then(() => {
            console.log('MongoDB connection closed');
            process.exit(0);
        })
        .catch(err => {
            console.error('Error closing MongoDB connection:', err);
            process.exit(1);
        });
}

// Start the server with error logging
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server startup error:', err);
});

// Listen for termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// No need to export modelCache here; it's imported from aiServices