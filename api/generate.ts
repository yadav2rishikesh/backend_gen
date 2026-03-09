import type { VercelRequest, VercelResponse } from '@vercel/node';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIRMED ENGINE ARCHITECTURE (from live Vercel logs debugging):
//
// ✅ CORRECT ENGINE for custom trained avatars (Manish, Ekta, etc.):
//    → v2/video/generate + avatar_version: 'v4'  (called "av4_v2" in logs)
//    → This IS Avatar IV for trained custom avatars
//    → Supports: custom_motion_prompt, enhance_custom_motion_prompt, emotion
//
// ❌ WRONG — v2/video/av4/generate:
//    → This endpoint is for PHOTO AVATARS (static image → talking video)
//    → Requires image_key field — not for trained avatars at all
//    → Removed from code to avoid unnecessary 400 error on every request
//
// WHAT DRIVES BODY MOTION in av4_v2:
//    1. emotion: "Friendly" in voice config — most important
//    2. custom_motion_prompt with explicit body parts (arms, hands)
//    3. enhance_custom_motion_prompt: true — AI refines the prompt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// UPGRADED motion prompts — explicit body parts + action + emotion
// Format: [Body part] + [Action] + [Manner] — per HeyGen AV4 best practice
const MOTION_PROMPTS: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": // Ekta
    "arms moving expressively while speaking, open palms facing outward, head straight to camera, confident smile",
  "10483c6d38564597a9491c0dbff9b0dd": // Swati
    "gentle arm gestures while talking, hands open at chest level, warm eye contact, soft nod",
  "b65c8b326bd546aba0edf4f4be65f37e": // Manish
    "arms raised and spread while presenting, strong hand gestures, direct eye contact, authoritative posture",
  "13c1f299bc854ed697ccf2c5a64218f9": // Nikhil
    "wide arm movements while speaking, hands gesturing outward, enthusiastic expression, leaning forward slightly",
  "621f9f7e33584a61a6a42d2d4e6b224c": // Nikhil v2
    "wide arm movements while speaking, hands gesturing outward, enthusiastic expression, leaning forward slightly",
  "b6529e10fb6a45aabe730acff799aebf": // Prashant
    "calm measured arm gestures, hands at mid-body level, steady eye contact, composed posture",
  "38ab20bc42634d368d4072b102aaa3d9": // Anoushka
    "friendly arm movements while talking, open hand gestures, warm smile, natural head tilt",
  "3024995942d148c887c9df208444c663": // Garvik
    "confident arm gestures while presenting, hands open and forward, strong eye contact, upright posture",
};

const DEFAULT_MOTION =
  "arms moving expressively while speaking, open palms, direct eye contact, natural head movement";

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

    // Clean script — strip emojis, normalize whitespace
    const cleanScript = script
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
      .replace(/[^\x00-\x7F\u0900-\u097F]/g, '') // keep ASCII + Devanagari
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500);

    const motionPrompt = MOTION_PROMPTS[avatar_id] || DEFAULT_MOTION;

    console.log(`\n▶ GENERATE REQUEST`);
    console.log(`  avatar_id : ${avatar_id}`);
    console.log(`  voice_id  : ${voice_id}`);
    console.log(`  script    : "${cleanScript.slice(0, 100)}..."`);
    console.log(`  motion    : "${motionPrompt}"`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Shared voice config used across all engine attempts
    // KEY FIX: emotion: "Friendly" — drives expressive body motion in AV4
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const voiceConfig = {
      type: 'text',
      voice_id,
      input_text: cleanScript,
      speed: 1.1,          // ← confirmed: 1.1
      pitch: 0,
      locale: 'en-IN',     // Indian English accent
      emotion: 'Friendly', // ← NEW: activates expressive body motion in AV4
    };

    // ─── ATTEMPT 1: Avatar IV for custom trained avatars ──────────
    // v2/video/generate + avatar_version: v4
    // This is the CORRECT Avatar IV engine for Manish, Ekta, Swati etc.
    // (v2/video/av4/generate is for Photo Avatars only — NOT for trained avatars)
    console.log('\n  [1/2] Trying v2/video/generate + avatar_version:v4 (Avatar IV)...');

    const v4Payload = {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id,
          avatar_style: 'normal',
        },
        voice: voiceConfig,
      }],
      dimension: { width: 1920, height: 1080 },
      avatar_version: 'v4',
      custom_motion_prompt: motionPrompt,
      enhance_custom_motion_prompt: true,
      caption: false,
      test: false,
    };

    const v4Res = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY,
      },
      body: JSON.stringify(v4Payload),
    });

    const v4Text = await v4Res.text();
    console.log(`  Avatar IV response [${v4Res.status}]: ${v4Text.slice(0, 500)}`);

    if (v4Res.ok) {
      const d = JSON.parse(v4Text);
      if (d?.data?.video_id) {
        console.log(`\n  ✅ ENGINE USED: av4_v2 (Avatar IV — correct engine for custom avatars)`);
        console.log(`  video_id: ${d.data.video_id}`);
        return res.status(200).json({ video_id: d.data.video_id, engine: 'av4_v2' });
      }
    }

    // ─── ATTEMPT 2: Avatar III fallback (lip sync only, no body motion) ──
    // If this runs → body will be static. Avatar IV rejected the avatar_id.
    console.log('\n  [2/2] Falling back to Avatar III (lip sync only — NO body motion)...');
    console.warn('  ⚠ WARNING: av3 fallback = static body.');

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
            speed: 1.1,
            pitch: 0,
          },
        }],
        dimension: { width: 1920, height: 1080 },
        caption: false,
        test: false,
      }),
    });

    const v3Text = await v3Res.text();
    console.log(`  Avatar III response [${v3Res.status}]: ${v3Text.slice(0, 500)}`);

    if (!v3Res.ok) throw new Error(`All 3 engines failed. Last: ${v3Text}`);

    const d = JSON.parse(v3Text);
    const video_id = d?.data?.video_id;
    if (!video_id) throw new Error(`No video_id in response: ${v3Text}`);

    console.log(`\n  ✅ ENGINE USED: av3_fallback`);
    console.log(`  video_id: ${video_id}`);
    return res.status(200).json({ video_id, engine: 'av3_fallback' });

  } catch (error: any) {
    console.error('❌ Generate error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate video' });
  }
}