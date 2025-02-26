import { body } from 'express-validator';

// Validation rules for registration
export const registerValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
    body('referralCode').optional().isString().withMessage('Invalid referral code'),
];