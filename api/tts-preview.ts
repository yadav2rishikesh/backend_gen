import type { VercelRequest, VercelResponse } from '@vercel/node';

// ✅ Your ElevenLabs Hindi male voice
const DEFAULT_ELEVENLABS_VOICE_ID = "JTPrASXyK62cF3L7w8hv";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const text: string = req.body?.text;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    // ✅ Limit to 500 chars for preview — fast response, saves free tier quota
    const previewText = text.slice(0, 500);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: previewText,
          model_id: 'eleven_multilingual_v2', // ✅ Supports Hindi
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs Error: ${errorText}`);
    }

    // ✅ ElevenLabs returns raw audio binary — convert to base64 and send to frontend
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({
      audio_base64: base64Audio,
      content_type: 'audio/mpeg',
    });

  } catch (error: any) {
    console.error('TTS preview error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate TTS preview' });
  }
}
