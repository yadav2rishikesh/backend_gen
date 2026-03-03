import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const response = await fetch('https://api.heygen.com/v2/voices', {
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HeyGen Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    // ✅ Return voices list array directly so frontend can iterate it
    return res.status(200).json(data.data?.list || data.data || []);

  } catch (error: any) {
    console.error('Voices error:', error);
    return res.status(500).json({ error: 'Failed to fetch voices' });
  }
}
