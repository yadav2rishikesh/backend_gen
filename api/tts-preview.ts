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
    console.log('ElevenLabs TTS request:', previewText.slice(0, 50));

    // Voice ID: "George" — multilingual, works well with Hindi/Hinglish
    // You can replace with any voice ID from your ElevenLabs account
    const voiceId = 'JBFqnCBsd6RMkjVDRZzb';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: previewText,
          model_id: 'eleven_multilingual_v2', // ✅ supports Hindi & Hinglish
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    console.log('ElevenLabs response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs Error ${response.status}: ${errorText}`);
    }

    // ✅ ElevenLabs returns raw audio bytes — convert to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({
      audio_base64: base64Audio,
      content_type: 'audio/mpeg', // ✅ ElevenLabs returns mp3
    });

  } catch (error: any) {
    console.error('TTS preview error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate TTS preview' });
  }
}
