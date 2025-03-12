// server/middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expect "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(401).json({ message: 'Invalid token' });
        }
        req.user = user; // Attach user data (including userId)
        console.log('Authenticated user in middleware:', user); // Debug log
        next();
    });
};

module.exports = authMiddleware;