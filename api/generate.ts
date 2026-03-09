
import type { VercelRequest, VercelResponse } from '@vercel/node';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

// ============================================================
// AVATAR → VOICE mapping
// ============================================================
const AVATAR_VOICE_MAP: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": "fe6e2fdcce394f39b9f44d855d8a60f6", // Ekta → Anoushka
  "10483c6d38564597a9491c0dbff9b0dd": "cc4332a68399483b82978733e8e2b1a9", // Swati Verma
  "13c1f299bc854ed697ccf2c5a64218f9": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil
  "621f9f7e33584a61a6a42d2d4e6b224c": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil alt
  "b65c8b326bd546aba0edf4f4be65f37e": "1cc594799c8240f09f0eadc86755b4eb", // Manish
  "b6529e10fb6a45aabe730acff799aebf": "1cc594799c8240f09f0eadc86755b4eb", // Prashant
  "38ab20bc42634d368d4072b102aaa3d9": "fe6e2fdcce394f39b9f44d855d8a60f6", // Anoushka
  "3024995942d148c887c9df208444c663": "89f231a9556d43dfa2e2bf96594b9a1c", // Garvik
};

// ============================================================
// Motion prompt — natural Indian presenter style
// ============================================================
const MOTION_PROMPT = "natural hand gestures while speaking, occasional nod, confident posture, maintains eye contact";

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

    const bestVoiceId = AVATAR_VOICE_MAP[avatar_id] || voice_id;
    if (!bestVoiceId) return res.status(400).json({ error: 'No voice found for this avatar' });

    console.log(`▶ avatar=${avatar_id} | voice=${bestVoiceId}`);

    // ── Voice settings ───────────────────────────────────────
    const voiceSettings = {
      type: 'text',
      voice_id: bestVoiceId,
      input_text: script,
      speed: 1.1,       // ✅ slightly faster — natural pace (was 1.0 = too slow)
      pitch: 0,
      locale: 'en-IN',  // ✅ Indian English accent
    };

    // ── Avatar IV payload ────────────────────────────────────
    const payloadV4 = {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id,
          avatar_style: 'normal',
        },
        voice: voiceSettings,
      }],
      dimension: { width: 1280, height: 720 },
      avatar_version: 'v4',         // ✅ Avatar IV — gestures + expressions + lip sync
      motion_prompt: MOTION_PROMPT, // ✅ body movement control
      caption: false,
      test: false,
    };

    // ── Avatar III fallback (no motion prompt) ───────────────
    const payloadV3 = {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id,
          avatar_style: 'normal',
        },
        voice: voiceSettings,
      }],
      dimension: { width: 1280, height: 720 },
      caption: false,
      test: false,
    };

    // ── Try Avatar IV first ──────────────────────────────────
    console.log('▶ Trying Avatar IV...');
    let response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY,
      },
      body: JSON.stringify(payloadV4),
    });

    let responseText = await response.text();
    console.log('Avatar IV response:', response.status, responseText);

    // ── Fallback to Avatar III ───────────────────────────────
    if (!response.ok) {
      console.log('⚠️ Avatar IV failed — falling back to Avatar III...');
      response = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': HEYGEN_API_KEY,
        },
        body: JSON.stringify(payloadV3),
      });
      responseText = await response.text();
      console.log('Avatar III response:', response.status, responseText);
    }

    if (!response.ok) throw new Error(`HeyGen ${response.status}: ${responseText}`);

    const data = JSON.parse(responseText);
    const video_id = data?.data?.video_id;
    if (!video_id) throw new Error(`No video_id: ${responseText}`);

    console.log('✅ Video queued:', video_id);
    return res.status(200).json({ video_id });

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}