import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { video_id } = req.query;

    if (!video_id) {
      return res.status(400).json({ error: 'Missing video_id' });
    }

    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${video_id}`,
      {
        headers: {
          'X-Api-Key': process.env.HEYGEN_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HeyGen Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Status response for', video_id, ':', JSON.stringify(data));

    // ✅ FIXED: unwrap and return flat object so frontend gets status & video_url directly
    return res.status(200).json({
      status: data.data?.status,
      video_url: data.data?.video_url,
      thumbnail_url: data.data?.thumbnail_url,
      duration: data.data?.duration,
    });

  } catch (error: any) {
    console.error('Status error:', error);
    return res.status(500).json({ error: 'Failed to get video status' });
  }
}
