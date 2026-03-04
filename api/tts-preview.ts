import type { VercelRequest, VercelResponse } from '@vercel/node';

// ✅ Sarvam AI Bulbul v3 — pure Hindi Indian male voice
// Available male voices: Aditya, Rahul, Rohan, Amit, Dev, Varun, Kabir, Manan, Shubh, Arjun
const SARVAM_SPEAKER = "arjun"; // Deep, clear Hindi male voice
const SARVAM_LANGUAGE = "hi-IN"; // Hindi India

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const text: string = req.body?.text;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    // ✅ Sarvam v3 supports up to 2500 chars — slice for fast preview
    const previewText = text.slice(0, 500);

    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'API-Subscription-Key': process.env.SARVAM_API_KEY || '', // ✅ correct casing
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [previewText],
        target_language_code: SARVAM_LANGUAGE,
        speaker: SARVAM_SPEAKER,
        model: 'bulbul:v2',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sarvam Error: ${errorText}`);
    }

    // ✅ Sarvam returns raw WAV audio bytes directly
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({
      audio_base64: base64Audio,
      content_type: 'audio/wav',
    });

  } catch (error: any) {
    console.error('TTS preview error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate TTS preview' });
  }
}
