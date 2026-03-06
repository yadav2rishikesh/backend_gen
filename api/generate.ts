import type { VercelRequest, VercelResponse } from '@vercel/node';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

// ✅ SIMPLE: Just use best Indian English voice IDs directly from HeyGen
// No ElevenLabs, no upload, no external services — just works!
const AVATAR_VOICE_MAP: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": "fe6e2fdcce394f39b9f44d855d8a60f6", // Ekta → Anoushka Chauhan (Indian female)
  "10483c6d38564597a9491c0dbff9b0dd": "cc4332a68399483b82978733e8e2b1a9", // Swati → Swati Verma (Indian female)
  "13c1f299bc854ed697ccf2c5a64218f9": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil → Nikhil Chhabria
  "621f9f7e33584a61a6a42d2d4e6b224c": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil alt
  "b65c8b326bd546aba0edf4f4be65f37e": "1cc594799c8240f09f0eadc86755b4eb", // Manish → Manish
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { avatar_id, voice_id, script } = req.body || {};
    if (!avatar_id) return res.status(400).json({ error: 'Missing avatar_id' });
    if (!script)    return res.status(400).json({ error: 'Missing script' });

    // Always use the best matched voice for each avatar
    const bestVoiceId = AVATAR_VOICE_MAP[avatar_id] || voice_id;
    console.log(`avatar="${avatar_id}" → voice="${bestVoiceId}" | script="${script?.slice(0,50)}"`);

    const payload = {
      video_inputs: [{
        character: { type: 'avatar', avatar_id, avatar_style: 'normal' },
        voice: {
          type: 'text',
          voice_id: bestVoiceId,
          input_text: script,
          speed: 1.0,
          pitch: 0,
        },
      }],
      dimension: { width: 1920, height: 1080 },
      avatar_version: 'v4',
      caption: true,
      test: false,
    };

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('HeyGen response:', responseText);
    if (!response.ok) throw new Error(`HeyGen ${response.status}: ${responseText}`);

    const data = JSON.parse(responseText);
    const video_id = data?.data?.video_id;
    if (!video_id) throw new Error(`No video_id: ${responseText}`);

    console.log('✅ Video started:', video_id);
    return res.status(200).json({ video_id });

  } catch (err: any) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
