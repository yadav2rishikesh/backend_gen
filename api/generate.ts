import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { avatar_id, voice_id, script } = req.body;

    if (!avatar_id || !voice_id || !script) {
      return res.status(400).json({
        error: "Missing avatar_id, voice_id or script"
      });
    }

    const response = await fetch(
      'https://api.heygen.com/v2/video.generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.HEYGEN_API_KEY || '',
        },
        body: JSON.stringify({
          video_inputs: [
            {
              avatar_id,
              voice: { voice_id },
              script: {
                type: "text",
                input: script,
              },
            },
          ],
          test: false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HeyGen Error: ${errorText}`);
    }

    const data = await response.json();

    // ✅ Return only video_id (clean contract)
    res.status(200).json({
      video_id: data.data?.video_id
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: error.message || 'Failed to generate video'
    });
  }
}
