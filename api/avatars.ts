import type { VercelRequest, VercelResponse } from '@vercel/node';

// ✅ YOUR personal avatar IDs — add new ones here when you create them on HeyGen
const MY_AVATAR_IDS = [
  "13c1f299bc854ed697ccf2c5a64218f9", // Nikhil Chhabria
  "621f9f7e33584a61a6a42d2d4e6b224c", // Nikhil Chhabria 2
  "b65c8b326bd546aba0edf4f4be65f37e", // Manish - Jio Avatar
  // Add more avatar_ids here as you create them
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
    const allAvatars = data?.data?.avatars ?? [];

    // ✅ Filter to only YOUR avatars
    const myAvatars = allAvatars.filter((a: any) =>
      MY_AVATAR_IDS.includes(a.avatar_id)
    );

    console.log(`Total: ${allAvatars.length} avatars, Yours: ${myAvatars.length}`);

    return res.status(200).json(myAvatars);

  } catch (error: any) {
    console.error('Avatars error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
