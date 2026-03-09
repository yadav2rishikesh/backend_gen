import type { VercelRequest, VercelResponse } from '@vercel/node';

const MY_AVATAR_IDS = new Set([
  "621f9f7e33584a61a6a42d2d4e6b224c", // Nikhil Chhabria
  "b65c8b326bd546aba0edf4f4be65f37e", // Manish - Jio Avatar
  "23a8ea2ea0294fe68b0f1f514081bf1d", // Ekta
  "10483c6d38564597a9491c0dbff9b0dd", // Swati Verma
  "b6529e10fb6a45aabe730acff799aebf", // Prashant R
  "38ab20bc42634d368d4072b102aaa3d9", // Anoushka Chauhan
  "3024995942d148c887c9df208444c663", // Garvik
  "13c1f299bc854ed697ccf2c5a64218f9", // Nikhil Chhabria alt
]);

const NAME_MAP: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": "Ekta",
  "10483c6d38564597a9491c0dbff9b0dd": "Swati Verma",
  "b65c8b326bd546aba0edf4f4be65f37e": "Manish - Jio Avatar",
  "13c1f299bc854ed697ccf2c5a64218f9": "Nikhil Chhabria",
  "621f9f7e33584a61a6a42d2d4e6b224c": "Nikhil Chhabria",
  "b6529e10fb6a45aabe730acff799aebf": "Prashant R | JFS Avatar",
  "38ab20bc42634d368d4072b102aaa3d9": "Anoushka Chauhan",
  "3024995942d148c887c9df208444c663": "Garvik",
};

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
      throw new Error(`HeyGen ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const allAvatars: any[] = data?.data?.avatars ?? [];

    const seen = new Set<string>();
    const myAvatars = allAvatars
      .filter((a) => MY_AVATAR_IDS.has(a.avatar_id))
      .filter((a) => {
        if (seen.has(a.avatar_id)) return false;
        seen.add(a.avatar_id);
        return true;
      })
      .map((a) => ({
        ...a,
        avatar_name: NAME_MAP[a.avatar_id] || a.avatar_name,
      }));

    console.log(`✅ Returning ${myAvatars.length} avatars`);
    return res.status(200).json(myAvatars);

  } catch (error: any) {
    console.error('❌ Avatars error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}