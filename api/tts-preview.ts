import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const text: string = req.body?.text;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const previewText = text.slice(0, 500);

    console.log('Sarvam TTS request:', previewText.slice(0, 50));

    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY || '', // ✅ exact header from docs
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [previewText],         // ✅ bulbul:v2 uses "inputs" array
        target_language_code: 'hi-IN', // ✅ Hindi India
        speaker: 'arjun',             // ✅ Hindi male voice
        model: 'bulbul:v2',           // ✅ v2 is stable and well supported
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,   // ✅ handles Hinglish, numbers, dates
      }),
    });

    const responseText = await response.text();
    console.log('Sarvam raw response:', responseText.slice(0, 200));

    if (!response.ok) {
      throw new Error(`Sarvam Error: ${responseText}`);
    }

    const data = JSON.parse(responseText);

    // ✅ Sarvam returns { audios: ["base64encodedstring"] }
    const base64Audio = data?.audios?.[0];
    if (!base64Audio) throw new Error('No audio in Sarvam response');

    return res.status(200).json({
      audio_base64: base64Audio,
      content_type: 'audio/wav',
    });

  } catch (error: any) {
    console.error('TTS preview error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate TTS preview' });
  }
}
