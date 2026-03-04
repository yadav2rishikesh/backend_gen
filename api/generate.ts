import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log('Raw body:', JSON.stringify(req.body));

    const avatar_id: string = req.body?.avatar_id;
    const voice_id: string  = req.body?.voice_id;
    const script: string    = req.body?.script;

    console.log(`avatar_id="${avatar_id}" voice_id="${voice_id}" script="${script?.slice(0, 50)}"`);

    if (!avatar_id) return res.status(400).json({ error: 'Missing avatar_id' });
    if (!voice_id)  return res.status(400).json({ error: 'Missing voice_id' });
    if (!script)    return res.status(400).json({ error: 'Missing script' });

    const payload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: avatar_id,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            // ✅ FIXED: use HeyGen voice_id, NOT ElevenLabs voice_id
            voice_id: voice_id,
            input_text: script,
            speed: 1.0,
          },
        },
      ],
      // ✅ No dimension — avoids resolution plan errors
      test: false,
    };

    console.log('Sending to HeyGen:', JSON.stringify(payload));

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': process.env.HEYGEN_API_KEY || '',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('HeyGen raw response:', responseText);

    if (!response.ok) {
      throw new Error(`HeyGen Error ${response.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    const video_id = data?.data?.video_id;

    if (!video_id) {
      throw new Error(`No video_id in response: ${responseText}`);
    }

    return res.status(200).json({ video_id });

  } catch (error: any) {
    console.error('Generate handler error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate video' });
  }
}
