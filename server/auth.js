import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'stihl-motors-dev-secret');

if (!jwtSecret) {
  throw new Error('JWT_SECRET es obligatorio en producción.');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
    },
    jwtSecret,
    { expiresIn: '12h', issuer: 'stihl-motors-api' },
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Token requerido.' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No autorizado para esta operación.' });
    }

    return next();
  };
}

export function decodeAuthTokenOptional(header = '') {
  const [, token] = String(header || '').split(' ');
  if (!token) return null;

  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}
