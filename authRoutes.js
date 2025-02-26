import express from 'express';
import { register, login, forgotPassword, resetPassword, redeemRewards, getReferrals, getReferralStats } from '../controllers/authController.js';
import { registerValidation } from '../utils/validators.js';
import authenticate from '../middleware/authenticate.js'; // Add authentication middleware

const router = express.Router();

// Register route
router.post('/register', registerValidation, register);

// Login route
router.post('/login', login);

// Forgot password route
router.post('/forgot-password', forgotPassword);

// Reset password route
router.post('/reset-password', resetPassword);

// Redeem rewards route
router.post('/redeem-rewards', authenticate, redeemRewards);

// Get referrals route (protected)
router.get('/referrals', authenticate, getReferrals);

// Get referral stats route (protected)
router.get('/referral-stats', authenticate, getReferralStats);

export default router;