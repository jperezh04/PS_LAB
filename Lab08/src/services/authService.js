import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { conflict, forbidden, unauthorized } from '../utils/httpError.js';
import { requiredEmail, requiredPassword, requiredString, assertValidation } from '../validators/commonValidators.js';

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export function createAuthService({ userRepository }) {
  function signToken(user) {
    return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  }

  return {
    signToken,
    publicUser,
    verifyToken(token) {
      try {
        return jwt.verify(token, env.jwtSecret);
      } catch (_) {
        throw unauthorized('Invalid or expired token.');
      }
    },
    register(body) {
      const errors = [];
      const username = requiredString(body, 'username', 3, 30, errors);
      const email = requiredEmail(body, 'email', errors);
      const password = requiredPassword(body, 'password', errors);
      assertValidation(errors);

      if (userRepository.findByEmail(email)) throw conflict('Email already exists.');
      if (userRepository.findByUsername(username)) throw conflict('Username already exists.');

      const user = userRepository.create({
        username,
        displayName: username,
        email,
        passwordHash: bcrypt.hashSync(password, 10),
        role: 'customer',
        status: 'active',
        avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(username)}`,
        bio: '',
        membership: 'free',
        joinedAt: new Date().toISOString()
      });

      return { message: 'Account created successfully.', user, token: signToken(user) };
    },
    login(body) {
      const errors = [];
      const email = requiredEmail(body, 'email', errors);
      const password = requiredPassword(body, 'password', errors);
      assertValidation(errors);

      const user = userRepository.findByEmail(email);
      if (!user || !bcrypt.compareSync(password, user.passwordHash)) throw unauthorized('Invalid credentials.');
      if (user.status !== 'active') throw forbidden('Account disabled.');

      return { message: 'Login successful.', user: publicUser(user), token: signToken(user) };
    },
    currentUser(user) {
      return { user: publicUser(user) };
    },
    forgotPassword(email) {
      const errors = [];
      requiredEmail({ email }, 'email', errors);
      assertValidation(errors);
      return { message: 'If the email exists, recovery instructions were sent.' };
    }
  };
}
