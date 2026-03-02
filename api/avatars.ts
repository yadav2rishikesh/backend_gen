import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const response = await fetch('https://api.heygen.com/v2/avatars', {
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY || '',
      },
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch avatars' });
  }
}