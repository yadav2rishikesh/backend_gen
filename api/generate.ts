import type { VercelRequest, VercelResponse } from '@vercel/node';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KEY FINDINGS FROM HEYGEN DOCS (June 2025 webinar + changelog):
//
// 1. Motion prompts must be SHORT — long prompts cause looping/overuse
// 2. enhance_custom_motion_prompt: true = "Prompt Refinement toggle"
//    This lets AI interpret simple phrases like "smiling while talking"
// 3. Motion is DRIVEN BY VOICE — expressive audio = better realism
// 4. Keep gesture prompts short to avoid looping
// 5. Results are NON-DETERMINISTIC — each render is unique
// 6. Credits: with custom_motion_prompt = 2:1 ratio (premium credits)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// SHORT motion prompts per HeyGen best practice
// Format: simple, short phrases — NOT long sentences
const MOTION_PROMPTS: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": "smiling confidently while talking, natural hand gestures",      // Ekta
  "10483c6d38564597a9491c0dbff9b0dd": "warm smile, gentle hand gestures, professional eye contact",    // Swati
  "b65c8b326bd546aba0edf4f4be65f37e": "authoritative gestures, strong eye contact, leaning forward",  // Manish
  "13c1f299bc854ed697ccf2c5a64218f9": "enthusiastic talking, open hand gestures, engaging smile",     // Nikhil
  "621f9f7e33584a61a6a42d2d4e6b224c": "enthusiastic talking, open hand gestures, engaging smile",     // Nikhil v2
  "b6529e10fb6a45aabe730acff799aebf": "calm professional gestures, steady eye contact",               // Prashant
  "38ab20bc42634d368d4072b102aaa3d9": "friendly smile, gentle gestures, warm eye contact",            // Anoushka
  "3024995942d148c887c9df208444c663": "confident posture, clear articulation gestures",               // Garvik
};

const DEFAULT_MOTION = "natural hand gestures, smiling while talking, eye contact";

// Voice matched per avatar
const AVATAR_VOICE_MAP: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": "fe6e2fdcce394f39b9f44d855d8a60f6", // Ekta
  "10483c6d38564597a9491c0dbff9b0dd": "cc4332a68399483b82978733e8e2b1a9", // Swati
  "b65c8b326bd546aba0edf4f4be65f37e": "1cc594799c8240f09f0eadc86755b4eb", // Manish
  "13c1f299bc854ed697ccf2c5a64218f9": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil
  "621f9f7e33584a61a6a42d2d4e6b224c": "89f231a9556d43dfa2e2bf96594b9a1c", // Nikhil v2
  "b6529e10fb6a45aabe730acff799aebf": "1cc594799c8240f09f0eadc86755b4eb", // Prashant
  "38ab20bc42634d368d4072b102aaa3d9": "fe6e2fdcce394f39b9f44d855d8a60f6", // Anoushka
  "3024995942d148c887c9df208444c663": "89f231a9556d43dfa2e2bf96594b9a1c", // Garvik
};

// Simple rate limiter — max 10 req/min per IP
const rateLimitMap = new Map<string, { count: number; reset: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  try {
    const avatar_id: string = req.body?.avatar_id;
    const voice_id: string  = req.body?.voice_id || AVATAR_VOICE_MAP[avatar_id] || '';
    const script: string    = req.body?.script;

    if (!avatar_id) return res.status(400).json({ error: 'Missing avatar_id' });
    if (!voice_id)  return res.status(400).json({ error: 'Missing voice_id' });
    if (!script)    return res.status(400).json({ error: 'Missing script' });

    // Clean script — remove emojis, normalize whitespace
    const cleanScript = script
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
      .replace(/[^\x00-\x7F\u0900-\u097F]/g, '') // keep ASCII + Devanagari
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500);

    // SHORT motion prompt per HeyGen best practice
    const motionPrompt = MOTION_PROMPTS[avatar_id] || DEFAULT_MOTION;

    console.log(`▶ Generate | avatar=${avatar_id} | voice=${voice_id}`);
    console.log(`  script="${cleanScript.slice(0, 80)}"`);
    console.log(`  motion="${motionPrompt}"`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ATTEMPT 1 — Dedicated Avatar IV endpoint
    // v2/video/av4/generate (released Oct 2024 per changelog)
    // This is what HeyGen Studio uses internally
    // Body movement is AUDIO-DRIVEN — voice emotion controls motion
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('  [1/3] Trying v2/video/av4/generate...');

    const av4Res = await fetch('https://api.heygen.com/v2/video/av4/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY,
      },
      body: JSON.stringify({
        avatar_id,
        voice: {
          type: 'text',
          voice_id,
          input_text: cleanScript,
          speed: 1.05,   // slightly faster — natural Indian speech pace
          pitch: 0,     // no pitch shift
          locale: 'en-IN', // Indian English accent
        },
        // SHORT prompts per HeyGen docs — avoid looping
        custom_motion_prompt: motionPrompt,
        // "Prompt Refinement toggle" — AI improves our prompt
        enhance_custom_motion_prompt: true,
        dimension: { width: 1920, height: 1080 },
        caption: false,
        test: false,
      }),
    });

    const av4Text = await av4Res.text();
    console.log(`  av4/generate [${av4Res.status}]: ${av4Text.slice(0, 300)}`);

    if (av4Res.ok) {
      const d = JSON.parse(av4Text);
      if (d?.data?.video_id) {
        console.log(`  ✅ av4_dedicated: ${d.data.video_id}`);
        return res.status(200).json({ video_id: d.data.video_id, engine: 'av4_dedicated' });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ATTEMPT 2 — v2/video/generate + avatar_version: v4
    // Same Avatar IV engine, older endpoint format
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('  [2/3] Falling back to v2/video/generate + avatar_version:v4...');

    const v4Res = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY,
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            voice_id,
            input_text: cleanScript,
            speed: 1.05,
            pitch: 0,
            locale: 'en-IN',
          },
        }],
        dimension: { width: 1920, height: 1080 },
        avatar_version: 'v4',
        custom_motion_prompt: motionPrompt,
        enhance_custom_motion_prompt: true,
        caption: false,
        test: false,
      }),
    });

    const v4Text = await v4Res.text();
    console.log(`  v2+v4 [${v4Res.status}]: ${v4Text.slice(0, 300)}`);

    if (v4Res.ok) {
      const d = JSON.parse(v4Text);
      if (d?.data?.video_id) {
        console.log(`  ✅ av4_v2: ${d.data.video_id}`);
        return res.status(200).json({ video_id: d.data.video_id, engine: 'av4_v2' });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ATTEMPT 3 — Avatar III fallback (lip sync only, no body)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('  [3/3] Falling back to Avatar III (lip sync only)...');

    const v3Res = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY,
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            voice_id,
            input_text: cleanScript,
            speed: 1.05,
            pitch: 0,
          },
        }],
        dimension: { width: 1920, height: 1080 },
        caption: false,
        test: false,
      }),
    });

    const v3Text = await v3Res.text();
    console.log(`  Avatar III [${v3Res.status}]: ${v3Text.slice(0, 300)}`);

    if (!v3Res.ok) throw new Error(`All engines failed. ${v3Text}`);

    const d = JSON.parse(v3Text);
    const video_id = d?.data?.video_id;
    if (!video_id) throw new Error(`No video_id: ${v3Text}`);

    console.log(`  ✅ av3_fallback: ${video_id}`);
    return res.status(200).json({ video_id, engine: 'av3_fallback' });

  } catch (error: any) {
    console.error('❌ Generate error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate video' });
  }
}
