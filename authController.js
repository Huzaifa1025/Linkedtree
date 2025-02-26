import User from '../models/User.js';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Register a new user
export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, referralCode } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if referral code is valid
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return res.status(400).json({ message: 'Invalid referral code' });
      }
    }

    // Create new user
    user = new User({ username, email, password, referredBy: referrer?._id });
    await user.save();

    // Update referrer's referral count and rewards
    if (referrer) {
      referrer.referralCount += 1;
      referrer.rewards += 10; // Example: Give 10 reward points for each successful referral
      await referrer.save();
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Generate referral link
    const referralLink = `https://yourdomain.com/register?referral=${user.referralCode}`;

    res.json({ token, referralLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    console.log('Request received for email:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({ message: 'User not found' });
    }

    // Generate reset token
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    console.log('Reset token generated:', token);

    // Send email
    const transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER, // Your Brevo SMTP username
        pass: process.env.EMAIL_PASS, // Your Brevo SMTP password
      },
    });

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested a password reset. Please click the following link to reset your password:\n\nhttp://localhost:5000/api/auth/reset-password/${token}\n\nIf you did not request this, please ignore this email.`,
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', user.email);
    res.status(200).json({ message: 'Password reset email sent' }); // Ensure proper JSON response
  } catch (err) {
    console.error('Error in forgotPassword:', err);

    // Handle specific Nodemailer errors
    if (err.code === 'EAUTH') {
      return res.status(500).json({ message: 'Email authentication failed. Check your email credentials.' });
    }

    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const redeemRewards = async (req, res) => {
  const { userId } = req;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has enough rewards
    if (user.rewards < 100) {
      return res.status(400).json({ message: 'Insufficient rewards' });
    }

    // Deduct rewards and grant premium feature
    user.rewards -= 100;
    user.isPremium = true;
    await user.save();

    res.json({ message: 'Premium feature unlocked!', rewards: user.rewards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReferrals = async (req, res) => {
  const { userId } = req;

  try {
    console.log('Fetching referrals for user:', userId);

    const user = await User.findById(userId).populate('referredBy', 'username email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find users referred by the logged-in user
    const referrals = await User.find({ referredBy: userId }, 'username email createdAt');
    console.log('Referrals found:', referrals);

    res.json({ referrals });
  } catch (err) {
    console.error('Error in getReferrals:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReferralStats = async (req, res) => {
  const { userId } = req;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch referral stats
    const referralCount = user.referralCount;
    const rewards = user.rewards;

    res.json({ referralCount, rewards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};