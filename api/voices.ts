// // import type { VercelRequest, VercelResponse } from '@vercel/node';

// // // ✅ Best natural Indian voices from HeyGen
// // const MY_VOICES = [
// //   {
// //     voice_id: "89f231a9556d43dfa2e2bf96594b9a1c",
// //     name: "Nikhil Chhabria",
// //     gender: "male",
// //     language: "En",
// //   },
// //   {
// //     voice_id: "1cc594799c8240f09f0eadc86755b4eb",
// //     name: "Manish - Jio Avatar",
// //     gender: "male",
// //     language: "En",
// //   },
// //   {
// //     voice_id: "dcf69bbbab5b41f2b75b9f86316c06c5", // ✅ Best natural Hindi female
// //     name: "Aruna - Natural",
// //     gender: "female",
// //     language: "Hi",
// //   },
// //   {
// //     voice_id: "9799f1ba6acd4b2b993fe813a18f9a91", // ✅ Friendly Hindi female
// //     name: "Swara - Friendly",
// //     gender: "female",
// //     language: "Hi",
// //   },
// // ];

// // export default async function handler(req: VercelRequest, res: VercelResponse) {
// //   res.setHeader('Access-Control-Allow-Origin', '*');
// //   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
// //   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
// //   res.setHeader('Cache-Control', 'no-store');
// //   if (req.method === 'OPTIONS') return res.status(200).end();

// //   return res.status(200).json({ voices: MY_VOICES });
// // }

// import type { VercelRequest, VercelResponse } from '@vercel/node';

// // ============================================================
// // Hardcoded Indian voices — matched to avatars
// // All use locale: en-IN in generate.ts for Indian accent
// // ============================================================
// const MY_VOICES = [
//   {
//     voice_id: "89f231a9556d43dfa2e2bf96594b9a1c",
//     name: "Nikhil Chhabria",
//     gender: "male",
//     language: "en-IN",
//   },
//   {
//     voice_id: "1cc594799c8240f09f0eadc86755b4eb",
//     name: "Manish",
//     gender: "male",
//     language: "en-IN",
//   },
//   {
//     voice_id: "fe6e2fdcce394f39b9f44d855d8a60f6",
//     name: "Anoushka Chauhan",
//     gender: "female",
//     language: "en-IN",
//   },
//   {
//     voice_id: "cc4332a68399483b82978733e8e2b1a9",
//     name: "Swati Verma",
//     gender: "female",
//     language: "en-IN",
//   },
// ];

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
//   res.setHeader('Cache-Control', 'no-store');
//   if (req.method === 'OPTIONS') return res.status(200).end();

//   return res.status(200).json(MY_VOICES);
// }
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