import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedUser } from '../types';

const router = Router();

// Start Google OAuth flow
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${env.FRONTEND_URL}/login?error=Google_auth_failed`,
  }),
  (req, res) => {
    // Generate JWT token as well so frontend can store in localStorage or use cookies
    const user = req.user as AuthenticatedUser;
    const token = jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.redirect(`${env.FRONTEND_URL}/dashboard?token=${token}`);
  }
);

export default router;
