import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ✅ CHANGED: added ?filter=personal — returns ONLY your avatars, not 1293 stock ones
    const response = await fetch('https://api.heygen.com/v2/avatars?filter=personal', {
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
    console.log('Personal avatars count:', data?.data?.avatars?.length);

    // Return only the avatars array
    return res.status(200).json(data.data?.avatars || []);

  } catch (error: any) {
    console.error('Avatars error:', error);
    return res.status(500).json({ error: 'Failed to fetch avatars' });
  }
}
