import type { VercelRequest, VercelResponse } from '@vercel/node';

// ✅ Hardcoded Swati Verma avatar only
const MY_AVATAR_IDS = [
  "10483c6d38564597a9491c0dbff9b0dd", // Swati Verma
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
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
    const allAvatars: any[] = data?.data?.avatars ?? [];

    // ✅ Filter to Swati only + deduplicate
    const seen = new Set<string>();
    const myAvatars = allAvatars
      .filter((a: any) => MY_AVATAR_IDS.includes(a.avatar_id))
      .filter((a: any) => {
        if (seen.has(a.avatar_id)) return false;
        seen.add(a.avatar_id);
        return true;
      })
      .map((a: any) => ({
        avatar_id: a.avatar_id,
        id: a.avatar_id,
        name: a.avatar_name || 'Swati Verma',
        image: a.preview_image_url || a.thumbnail_url || '',
        role: a.gender || 'female',
      }));

    console.log(`Returning ${myAvatars.length} avatars`);
    return res.status(200).json(myAvatars);
  } catch (error: any) {
    console.error('Avatars error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
