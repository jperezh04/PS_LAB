import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const rawName = path.parse(file.originalname).name || 'cover';
    const safeName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'cover';
    const extensionByMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
    cb(null, `${Date.now()}-${safeName}${extensionByMime[file.mimetype]}`);
  }
});

const uploader = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedImageTypes.has(file.mimetype)) return cb(new Error('Cover image must be JPG, PNG or WEBP.'));
    cb(null, true);
  }
});

function singleImage(field) {
  return (req, res, next) => {
    uploader.single(field)(req, res, error => {
      if (!error) return next();
      const message = error.code === 'LIMIT_FILE_SIZE' ? 'Cover image must not exceed 5MB.' : error.message;
      return res.status(400).json({ message: 'Validation error', errors: [{ field, message }] });
    });
  };
}

export const uploadCover = singleImage('coverImage');
export const uploadAvatar = singleImage('avatar');

export function uploadedUrl(req) {
  return req.file ? `/uploads/covers/${req.file.filename}` : null;
}
