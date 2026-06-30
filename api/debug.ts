import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ARIZE_API_KEY: process.env.ARIZE_API_KEY
      ? `SET (${process.env.ARIZE_API_KEY.length} chars, starts: ${process.env.ARIZE_API_KEY.slice(0,4)}...)`
      : 'MISSING',
    ARIZE_SPACE_ID: process.env.ARIZE_SPACE_ID
      ? `SET (${process.env.ARIZE_SPACE_ID.length} chars, starts: ${process.env.ARIZE_SPACE_ID.slice(0,4)}...)`
      : 'MISSING',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  });
}
