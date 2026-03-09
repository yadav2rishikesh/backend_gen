
//   import type { VercelRequest, VercelResponse } from '@vercel/node';

// const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

// const AVATAR_VOICE_MAP: Record<string, string> = {
//   "23a8ea2ea0294fe68b0f1f514081bf1d": "fe6e2fdcce394f39b9f44d855d8a60f6", // Ekta → Anoushka Chauhan
//   "10483c6d38564597a9491c0dbff9b0dd": "cc4332a68399483b82978733e8e2b1a9", // Swati → Swati Verma
//   "13c1f299bc854ed697ccf2c5a64218f9": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil
//   "621f9f7e33584a61a6a42d2d4e6b224c": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil alt
//   "b65c8b326bd546aba0edf4f4be65f37e": "1cc594799c8240f09f0eadc86755b4eb", // Manish
//   "b6529e10fb6a45aabe730acff799aebf": "1cc594799c8240f09f0eadc86755b4eb", // Prashant (male)
//   "38ab20bc42634d368d4072b102aaa3d9": "fe6e2fdcce394f39b9f44d855d8a60f6", // Anoushka
//   "3024995942d148c887c9df208444c663": "89f231a9556d43dfa2e2bf96594b9a1c", // Garvik (male)
// };

// const INDIAN_ACCENT_AVATARS = new Set([
//   "23a8ea2ea0294fe68b0f1f514081bf1d", // Ekta
//   "10483c6d38564597a9491c0dbff9b0dd", // Swati
// ]);

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
//   if (req.method === 'OPTIONS') return res.status(200).end();
//   if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

//   try {
//     const { avatar_id, voice_id, script } = req.body || {};
//     if (!avatar_id) return res.status(400).json({ error: 'Missing avatar_id' });
//     if (!script)    return res.status(400).json({ error: 'Missing script' });

//     const bestVoiceId = AVATAR_VOICE_MAP[avatar_id] || voice_id;
//     const useIndianAccent = INDIAN_ACCENT_AVATARS.has(avatar_id);
//     console.log(`avatar="${avatar_id}" voice="${bestVoiceId}" indian=${useIndianAccent}`);

//     const payload = {
//       video_inputs: [{
//         character: {
//           type: 'avatar',
//           avatar_id,
//           avatar_style: 'normal',
//         },
//         voice: {
//           type: 'text',
//           voice_id: bestVoiceId,
//           input_text: script,
//           speed: 1.0,
//           pitch: 0,
//           // ✅ Force Indian English accent
//           ...(useIndianAccent ? { locale: 'en-IN' } : {}),
//         },
//       }],
//       dimension: { width: 1280, height: 720 },
//       avatar_version: 'v4', // ✅ rolled out to 100% users per docs
//       caption: true,
//       test: false,
//     };

//     // ✅ Try Avatar IV dedicated endpoint first
//     console.log('Trying Avatar IV endpoint...');
//     let response = await fetch('https://api.heygen.com/v2/video/generate', {
//       method: 'POST',
//       headers: {
//         'accept': 'application/json',
//         'content-type': 'application/json',
//         'x-api-key': HEYGEN_API_KEY,
//       },
//       body: JSON.stringify(payload),
//     });

//     let responseText = await response.text();
//     console.log('v4 response:', responseText);

//     // ✅ Fallback: if v4 rejected, retry without avatar_version
//     if (!response.ok) {
//       console.log('v4 failed, retrying without avatar_version...');
//       const fallbackPayload = { ...payload };
//       delete (fallbackPayload as any).avatar_version;

//       response = await fetch('https://api.heygen.com/v2/video/generate', {
//         method: 'POST',
//         headers: {
//           'accept': 'application/json',
//           'content-type': 'application/json',
//           'x-api-key': HEYGEN_API_KEY,
//         },
//         body: JSON.stringify(fallbackPayload),
//       });
//       responseText = await response.text();
//       console.log('fallback response:', responseText);
//     }

//     if (!response.ok) throw new Error(`HeyGen ${response.status}: ${responseText}`);

//     const data = JSON.parse(responseText);
//     const video_id = data?.data?.video_id;
//     if (!video_id) throw new Error(`No video_id: ${responseText}`);

//     console.log('✅ Video started:', video_id);
//     return res.status(200).json({ video_id });

//   } catch (err: any) {
//     console.error('Error:', err.message);
//     return res.status(500).json({ error: err.message });
//   }
// }

import type { VercelRequest, VercelResponse } from '@vercel/node';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

// ============================================================
// AVATAR → VOICE mapping (HeyGen voice IDs)
// ============================================================
const AVATAR_VOICE_MAP: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": "fe6e2fdcce394f39b9f44d855d8a60f6", // Ekta → Anoushka voice
  "10483c6d38564597a9491c0dbff9b0dd": "cc4332a68399483b82978733e8e2b1a9", // Swati Verma
  "13c1f299bc854ed697ccf2c5a64218f9": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil Chhabria
  "621f9f7e33584a61a6a42d2d4e6b224c": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil alt
  "b65c8b326bd546aba0edf4f4be65f37e": "1cc594799c8240f09f0eadc86755b4eb", // Manish
  "b6529e10fb6a45aabe730acff799aebf": "1cc594799c8240f09f0eadc86755b4eb", // Prashant (male)
  "38ab20bc42634d368d4072b102aaa3d9": "fe6e2fdcce394f39b9f44d855d8a60f6", // Anoushka
  "3024995942d148c887c9df208444c663": "89f231a9556d43dfa2e2bf96594b9a1c", // Garvik (male)
};

// ============================================================
// ALL avatars use en-IN locale for Indian accent
// ============================================================
const MOTION_PROMPT = "speaks naturally with gentle hand gestures, occasional nods, maintains eye contact, professional and confident";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { avatar_id, voice_id, script } = req.body || {};

    // ── Validate inputs ──────────────────────────────────────
    if (!avatar_id) return res.status(400).json({ error: 'Missing avatar_id' });
    if (!script)    return res.status(400).json({ error: 'Missing script' });

    // ── Pick best voice ──────────────────────────────────────
    const bestVoiceId = AVATAR_VOICE_MAP[avatar_id] || voice_id;
    if (!bestVoiceId) return res.status(400).json({ error: 'No voice found for this avatar' });

    console.log(`▶ Generating | avatar=${avatar_id} | voice=${bestVoiceId}`);

    // ── Build payload ────────────────────────────────────────
    const payload = {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id,
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          voice_id: bestVoiceId,
          input_text: script,
          speed: 1.0,
          pitch: 0,
          locale: 'en-IN',   // ✅ Indian English accent for ALL avatars
        },
      }],
      dimension: { width: 1280, height: 720 },
      caption: false,
      test: false,
    };

    // ── Try with Avatar IV (v4) first ────────────────────────
    const payloadV4 = {
      ...payload,
      avatar_version: 'v4',                    // ✅ Avatar IV — gestures + expressions
      motion_prompt: MOTION_PROMPT,            // ✅ natural body movement
    };

    console.log('Trying Avatar IV...');
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
    console.log('Avatar IV response:', responseText);

    // ── Fallback: Avatar III if IV rejected ──────────────────
    if (!response.ok) {
      console.log('Avatar IV failed — falling back to Avatar III...');
      response = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': HEYGEN_API_KEY,
        },
        body: JSON.stringify(payload), // without avatar_version + motion_prompt
      });
      responseText = await response.text();
      console.log('Avatar III fallback response:', responseText);
    }

    if (!response.ok) throw new Error(`HeyGen ${response.status}: ${responseText}`);

    const data = JSON.parse(responseText);
    const video_id = data?.data?.video_id;
    if (!video_id) throw new Error(`No video_id in response: ${responseText}`);

    console.log('✅ Video queued:', video_id);
    return res.status(200).json({ video_id });

  } catch (err: any) {
    console.error('❌ Generate error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}