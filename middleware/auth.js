const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }   

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

exports.authorize = (...allowedRoles) => {
    return (req, res, next) => {

        console.log('req.user:', req.user);
        console.log('allowedRoles:', allowedRoles);
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to perform this' });
        }
        next();
    };
};