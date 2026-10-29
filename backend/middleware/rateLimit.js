const rateLimit = require('express-rate-limit');

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false
};

exports.loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed sign-in attempts. Wait 15 minutes and try again.' }
});

exports.registerLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: { error: 'Too many accounts were created from this network. Try again in an hour.' }
});

exports.passwordLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many failed attempts. Wait 15 minutes and try again.' }
});