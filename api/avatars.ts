import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    // ✅ Filter only YOUR personal avatars (premium: false = your own custom avatars)
    // ✅ Deduplicate by avatar_id (HeyGen sometimes returns same avatar twice)
    // ✅ default_voice_id comes from HeyGen — natural human cloned voice auto-matched
    const seen = new Set<string>();
    const myAvatars = allAvatars
      .filter((a: any) => a.premium === false)
      .filter((a: any) => {
        if (seen.has(a.avatar_id)) return false;
        seen.add(a.avatar_id);
        return true;
      });

    console.log(`Total: ${allAvatars.length} | Your personal: ${myAvatars.length}`);
    return res.status(200).json(myAvatars);

  } catch (error: any) {
    console.error('Avatars error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
