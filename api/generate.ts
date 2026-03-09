import type { VercelRequest, VercelResponse } from '@vercel/node';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

// Avatar-specific motion prompts — tuned per person
const MOTION_PROMPTS: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": // Ekta
    "Speaks naturally with soft hand gestures, occasional nods, warm confident smile, maintains eye contact, professional yet approachable",
  "10483c6d38564597a9491c0dbff9b0dd": // Swati
    "Speaks with gentle gestures, warm expressions, slight head tilts, professional demeanor, natural pauses between sentences",
  "b65c8b326bd546aba0edf4f4be65f37e": // Manish
    "Speaks confidently with deliberate hand movements, strong eye contact, occasional forward lean for emphasis, authoritative yet friendly",
  "13c1f299bc854ed697ccf2c5a64218f9": // Nikhil
    "Speaks with natural energy, expressive hand gestures, smiles while talking, engaging eye contact, dynamic and enthusiastic",
  "621f9f7e33584a61a6a42d2d4e6b224c": // Nikhil v2
    "Speaks with natural energy, expressive hand gestures, smiles while talking, engaging eye contact, dynamic and enthusiastic",
  "b6529e10fb6a45aabe730acff799aebf": // Prashant
    "Speaks calmly and clearly, measured gestures, professional posture, confident eye contact, steady and trustworthy delivery",
  "38ab20bc42634d368d4072b102aaa3d9": // Anoushka
    "Speaks with warmth and clarity, gentle gestures, natural smile, maintains eye contact, approachable and professional",
  "3024995942d148c887c9df208444c663": // Garvik
    "Speaks confidently with clear articulation, professional gestures, strong eye contact, calm and assured delivery",
};

const DEFAULT_MOTION_PROMPT =
  "Speaks naturally with appropriate hand gestures, maintains eye contact, professional and engaging delivery, natural head movements";

// Voice map — matched to avatars
const AVATAR_VOICE_MAP: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": "fe6e2fdcce394f39b9f44d855d8a60f6", // Ekta → Anoushka
  "10483c6d38564597a9491c0dbff9b0dd": "cc4332a68399483b82978733e8e2b1a9", // Swati
  "b65c8b326bd546aba0edf4f4be65f37e": "1cc594799c8240f09f0eadc86755b4eb", // Manish
  "13c1f299bc854ed697ccf2c5a64218f9": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil
  "621f9f7e33584a61a6a42d2d4e6b224c": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil v2
  "b6529e10fb6a45aabe730acff799aebf": "1cc594799c8240f09f0eadc86755b4eb", // Prashant
  "38ab20bc42634d368d4072b102aaa3d9": "fe6e2fdcce394f39b9f44d855d8a60f6", // Anoushka
  "3024995942d148c887c9df208444c663": "89f231a9556d43dfa2e2bf96594b9a1c", // Garvik
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const avatar_id: string = req.body?.avatar_id;
    const voice_id: string  = req.body?.voice_id || AVATAR_VOICE_MAP[avatar_id] || '';
    const script: string    = req.body?.script;

    if (!avatar_id) return res.status(400).json({ error: 'Missing avatar_id' });
    if (!voice_id)  return res.status(400).json({ error: 'Missing voice_id' });
    if (!script)    return res.status(400).json({ error: 'Missing script' });

    // Sanitize script — remove emojis, excess whitespace
    const cleanScript = script
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500);

    const motionPrompt = MOTION_PROMPTS[avatar_id] || DEFAULT_MOTION_PROMPT;

    console.log(`Generating | avatar=${avatar_id} | voice=${voice_id} | script="${cleanScript.slice(0, 60)}..."`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ATTEMPT 1: Dedicated Avatar IV endpoint (best quality)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('▶ Trying dedicated Avatar IV endpoint (v2/video/av4/generate)...');

    const av4Payload = {
      avatar_id: avatar_id,
      voice: {
        voice_id: voice_id,
        input_text: cleanScript,
        type: 'text',
        speed: 1.0,
        pitch: 0,
        locale: 'en-IN',
      },
      custom_motion_prompt: motionPrompt,
      enhance_custom_motion_prompt: true,  // Let AI improve our motion prompt
      dimension: { width: 1920, height: 1080 },
      caption: false,
      title: `Video_${Date.now()}`,
      test: false,
    };

    const av4Response = await fetch('https://api.heygen.com/v2/video/av4/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY,
      },
      body: JSON.stringify(av4Payload),
    });

    const av4Text = await av4Response.text();
    console.log(`Avatar IV (av4) response [${av4Response.status}]:`, av4Text.slice(0, 300));

    if (av4Response.ok) {
      const av4Data = JSON.parse(av4Text);
      const video_id = av4Data?.data?.video_id;
      if (video_id) {
        console.log(`✅ Avatar IV (av4) queued: ${video_id}`);
        return res.status(200).json({ video_id, engine: 'avatar_iv_dedicated' });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ATTEMPT 2: v2/video/generate with avatar_version: v4 + motion prompt
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('⚠️ av4 endpoint failed — trying v2/video/generate with avatar_version: v4...');

    const v2Payload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: avatar_id,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            voice_id: voice_id,
            input_text: cleanScript,
            speed: 1.0,
            pitch: 0,
            locale: 'en-IN',
          },
        },
      ],
      dimension: { width: 1920, height: 1080 },
      avatar_version: 'v4',
      custom_motion_prompt: motionPrompt,
      enhance_custom_motion_prompt: true,
      caption: false,
      title: `Video_${Date.now()}`,
      test: false,
    };

    const v2Response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY,
      },
      body: JSON.stringify(v2Payload),
    });

    const v2Text = await v2Response.text();
    console.log(`v2/generate+v4 response [${v2Response.status}]:`, v2Text.slice(0, 300));

    if (v2Response.ok) {
      const v2Data = JSON.parse(v2Text);
      const video_id = v2Data?.data?.video_id;
      if (video_id) {
        console.log(`✅ v2+v4 queued: ${video_id}`);
        return res.status(200).json({ video_id, engine: 'avatar_iv_v2' });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ATTEMPT 3: Avatar III fallback (still has motion prompt)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('⚠️ v4 failed — falling back to Avatar III...');

    const v3Payload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: avatar_id,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            voice_id: voice_id,
            input_text: cleanScript,
            speed: 1.0,
            pitch: 0,
            locale: 'en-IN',
          },
        },
      ],
      dimension: { width: 1920, height: 1080 },
      caption: false,
      title: `Video_${Date.now()}`,
      test: false,
    };

    const v3Response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY,
      },
      body: JSON.stringify(v3Payload),
    });

    const v3Text = await v3Response.text();
    console.log(`v3 fallback response [${v3Response.status}]:`, v3Text.slice(0, 300));

    if (!v3Response.ok) {
      throw new Error(`All engines failed. Last error: ${v3Text}`);
    }

    const v3Data = JSON.parse(v3Text);
    const video_id = v3Data?.data?.video_id;
    if (!video_id) throw new Error(`No video_id returned: ${v3Text}`);

    console.log(`✅ Avatar III fallback queued: ${video_id}`);
    return res.status(200).json({ video_id, engine: 'avatar_iii' });

  } catch (error: any) {
    console.error('Generate handler error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate video' });
  }
}