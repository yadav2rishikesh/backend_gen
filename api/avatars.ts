import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const response = await fetch('https://api.heygen.com/v2/avatars', {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.HEYGEN_API_KEY || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HeyGen Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // ✅ Return ONLY avatars array
    res.status(200).json(data.data?.avatars || []);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch avatars' });
  }
}
