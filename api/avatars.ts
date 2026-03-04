import type { VercelRequest, VercelResponse } from '@vercel/node';

// ✅ Your personal avatar IDs — add new ones here when you create on HeyGen
// Voice is automatically taken from HeyGen's own default_voice_id — no hardcoding needed
const MY_AVATAR_IDS = [
  "621f9f7e33584a61a6a42d2d4e6b224c", // Nikhil Chhabria
  "b65c8b326bd546aba0edf4f4be65f37e", // Manish - Jio Avatar
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

    // ✅ Filter to YOUR avatars only + deduplicate by avatar_id
    const seen = new Set<string>();
    const myAvatars = allAvatars
      .filter((a: any) => MY_AVATAR_IDS.includes(a.avatar_id))
      .filter((a: any) => {
        if (seen.has(a.avatar_id)) return false;
        seen.add(a.avatar_id);
        return true;
      });

    console.log(`Returning ${myAvatars.length} personal avatars`);
    // ✅ default_voice_id already comes from HeyGen — natural human voice
    return res.status(200).json(myAvatars);

  } catch (error: any) {
    console.error('Avatars error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
