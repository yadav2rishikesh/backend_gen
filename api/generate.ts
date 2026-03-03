import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { avatar_id, voice_id, script } = req.body;

    if (!avatar_id || !voice_id || !script) {
      return res.status(400).json({ error: 'Missing avatar_id, voice_id or script' });
    }

    // ✅ Log so you can verify in Vercel logs which avatar_id is received
    console.log('Generating video with avatar_id:', avatar_id);

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.HEYGEN_API_KEY || '',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            // ✅ FIXED: avatar_id must be nested inside character object — this was the root cause
            character: {
              type: 'avatar',
              avatar_id: avatar_id,
            },
            voice: {
              type: 'text',
              voice_id: voice_id,
            },
            script: {
              type: 'text',
              input: script,
            },
          },
        ],
        dimension: { width: 1280, height: 720 },
        test: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen API error:', errorText);
      throw new Error(`HeyGen Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('HeyGen generate response:', JSON.stringify(data));

    return res.status(200).json({
      video_id: data.data?.video_id
    });

  } catch (error: any) {
    console.error('Generate error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate video' });
  }
}
