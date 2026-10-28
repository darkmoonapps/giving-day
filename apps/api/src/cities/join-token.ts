import { createHash, randomBytes } from 'node:crypto';

export function generateJoinToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashJoinToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function joinLinkUrl(rawToken: string): string {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${frontendUrl.replace(/\/$/, '')}/join/${rawToken}`;
}
