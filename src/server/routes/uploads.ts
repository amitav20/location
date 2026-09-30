/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { UPLOADS_DIR } from '../db';
import { badRequest, currentUserId, str } from '../http';

// Photo / video / voice-note uploads. The browser sends the file as a data URL; we check the type
// against an allow-list (no SVG/HTML, which could run scripts) and store it under data/uploads.
export const uploadsRouter = express.Router();

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const ALLOWED: Record<string, { ext: string; kind: 'image' | 'video' | 'audio' }> = {
  'image/jpeg': { ext: 'jpg', kind: 'image' },
  'image/png': { ext: 'png', kind: 'image' },
  'image/gif': { ext: 'gif', kind: 'image' },
  'image/webp': { ext: 'webp', kind: 'image' },
  'video/mp4': { ext: 'mp4', kind: 'video' },
  'video/webm': { ext: 'webm', kind: 'video' },
  'video/quicktime': { ext: 'mov', kind: 'video' },
  'audio/webm': { ext: 'weba', kind: 'audio' },
  'audio/ogg': { ext: 'ogg', kind: 'audio' },
  'audio/mpeg': { ext: 'mp3', kind: 'audio' },
  'audio/mp4': { ext: 'm4a', kind: 'audio' },
  'audio/wav': { ext: 'wav', kind: 'audio' }
};

uploadsRouter.post('/uploads', (req, res) => {
  currentUserId(req);
  const dataUrl = str(req.body?.dataUrl, 'File', { max: Math.ceil(MAX_UPLOAD_BYTES * 1.4) + 100, required: true });
  const match = /^data:([a-z]+\/[a-z0-9.+-]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) throw badRequest('Unsupported file format.');

  const mime = match[1].toLowerCase();
  const type = ALLOWED[mime];
  if (!type) throw badRequest('Only photos (JPG, PNG, GIF, WebP), videos (MP4, WebM, MOV) and audio files can be uploaded.');

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0) throw badRequest('The file is empty.');
  if (bytes.length > MAX_UPLOAD_BYTES) throw badRequest('Files must be 8 MB or smaller.');

  const fileName = `${randomUUID()}.${type.ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), bytes);
  res.status(201).json({ url: `/uploads/${fileName}`, kind: type.kind, mime });
});
