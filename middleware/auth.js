const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        const user = await User.findById(decoded.id).select('role passwordChangedAt');

        if (!user) {
            return res.status(401).json({ error: 'This account no longer exists' });
        }

        if (
            user.passwordChangedAt &&
            Math.floor(user.passwordChangedAt.getTime() / 1000) > decoded.iat
        ) {
            return res.status(401).json({ error: 'Your password was changed. Sign in again.' });
        }

        req.user = { id: user._id.toString(), role: user.role };
        next();
    } catch (err) {
        res.status(500).json({ error: 'Could not verify your account. Try again.' });
    }
};

exports.authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to perform this' });
        }
        next();
    };
};