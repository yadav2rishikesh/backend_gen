import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const voice_id: string = req.body?.voice_id;
    const text: string = req.body?.text;

    if (!voice_id) return res.status(400).json({ error: 'Missing voice_id' });
    if (!text) return res.status(400).json({ error: 'Missing text' });

    // ✅ Limit to 300 chars for preview — saves cost, loads fast
    const previewText = text.slice(0, 300);

    const response = await fetch('https://api.heygen.com/v1/audio/text_to_speech', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': process.env.HEYGEN_API_KEY || '',
      },
      body: JSON.stringify({
        voice_id,
        text: previewText,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HeyGen TTS Error: ${errorText}`);
    }

    const data = await response.json();
    // HeyGen returns { data: { audio_url: "..." } }
    const audioUrl = data?.data?.audio_url ?? data?.audio_url;

    if (!audioUrl) {
      throw new Error('No audio_url returned from HeyGen');
    }

    return res.status(200).json({ audio_url: audioUrl });

  } catch (error: any) {
    console.error('TTS preview error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate TTS preview' });
  }
}
