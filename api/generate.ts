import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { avatar_id, voice_id, script } = req.body;

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
              voice: {
                voice_id,
              },
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

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate video' });
  }
}
