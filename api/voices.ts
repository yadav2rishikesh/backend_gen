import type { VercelRequest, VercelResponse } from '@vercel/node';

// Matched avatar voices — these are the voices recorded with each avatar
// locale: en-IN is applied in generate.ts for Indian accent
const MY_VOICES = [
  { voice_id: "89f231a9556d43dfa2e2bf96594b9a1c", name: "Nikhil Chhabria",    gender: "male",   language: "en-IN" },
  { voice_id: "1cc594799c8240f09f0eadc86755b4eb", name: "Manish",             gender: "male",   language: "en-IN" },
  { voice_id: "fe6e2fdcce394f39b9f44d855d8a60f6", name: "Anoushka Chauhan",   gender: "female", language: "en-IN" },
  { voice_id: "cc4332a68399483b82978733e8e2b1a9", name: "Swati Verma",        gender: "female", language: "en-IN" },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json(MY_VOICES);
}
