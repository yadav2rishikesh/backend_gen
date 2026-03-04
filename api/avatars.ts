import type { VercelRequest, VercelResponse } from '@vercel/node';

// ✅ YOUR personal avatar IDs — only these will show in the app
// Each avatar has a default_voice_id mapped here
const MY_AVATARS = [
  {
    avatar_id: "621f9f7e33584a61a6a42d2d4e6b224c",
    default_voice_id: "9376301972aa48c2ae145ba31190584c", // Nikhil Chhabria voice
  },
  {
    avatar_id: "b65c8b326bd546aba0edf4f4be65f37e",
    default_voice_id: "yki2AOWh6uhUTfN1hEX0", // Deep Indian Pro
  },
];

const MY_AVATAR_IDS = MY_AVATARS.map((a) => a.avatar_id);

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

    // ✅ Filter to only YOUR avatars and inject default_voice_id
    const myAvatars = allAvatars
      .filter((a: any) => MY_AVATAR_IDS.includes(a.avatar_id))
      .map((a: any) => {
        const config = MY_AVATARS.find((m) => m.avatar_id === a.avatar_id);
        return {
          ...a,
          default_voice_id: config?.default_voice_id ?? null,
        };
      });

    console.log(`Returning ${myAvatars.length} personal avatars`);
    return res.status(200).json(myAvatars);

  } catch (error: any) {
    console.error('Avatars error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
