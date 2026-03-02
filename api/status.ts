import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { video_id } = req.query;

    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${video_id}`,
      {
        headers: {
          'X-Api-Key': process.env.HEYGEN_API_KEY || '',
        },
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get video status' });
  }
}