import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import { AuthenticatedUser } from '../types';

export function configurePassport(): void {
  // Serialize User to Session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize User from Session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, avatar: true, role: true },
      });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // 1. Google OAuth Strategy
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found from Google profile'), undefined);
            }

            const name = profile.displayName || profile.name?.givenName || 'Google User';
            const avatar = profile.photos?.[0]?.value || null;

            // Find or create user
            const user = await prisma.user.upsert({
              where: { email },
              update: {
                googleId: profile.id,
                name: name,
                avatar: avatar,
              },
              create: {
                email,
                googleId: profile.id,
                name,
                avatar,
                role: 'user',
              },
            });

            const authUser: AuthenticatedUser = {
              id: user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
              role: user.role,
            };

            return done(null, authUser);
          } catch (err) {
            logger.error({ err }, 'Google OAuth error');
            return done(err as Error, undefined);
          }
        }
      )
    );
    logger.info('Google OAuth strategy configured');
  } else {
    logger.warn('Google OAuth credentials not provided in .env - Google Login will be disabled');
  }

  // 2. Local Strategy (Email & Password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
          });

          if (!user || !user.passwordHash) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const authUser: AuthenticatedUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
          };

          return done(null, authUser);
        } catch (err) {
          logger.error({ err }, 'Local auth error');
          return done(err);
        }
      }
    )
  );
}
