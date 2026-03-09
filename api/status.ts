import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { video_id } = req.query;
    if (!video_id) return res.status(400).json({ error: 'Missing video_id' });

    // Cache-bust with timestamp to prevent Edge/incognito stale responses
    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${video_id}&_t=${Date.now()}`,
      { headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY || '' } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HeyGen ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const status    = data?.data?.status ?? 'unknown';
    const video_url = data?.data?.video_url ?? null;
    const rawError  = data?.data?.error ?? null;

    // Always return error as readable string — no more [object Object]
    let errorMessage: string | null = null;
    if (rawError) {
      errorMessage = typeof rawError === 'string'
        ? rawError
        : rawError.message || rawError.code || JSON.stringify(rawError);
    }

    if (status === 'failed')    console.error(`❌ Video ${video_id} failed:`, errorMessage);
    if (status === 'completed') console.log(`✅ Video ${video_id} ready:`, video_url);
    else                        console.log(`⏳ Video ${video_id} status: ${status}`);

    return res.status(200).json({
      status,
      video_url,
      thumbnail_url: data?.data?.thumbnail_url ?? null,
      duration:      data?.data?.duration ?? null,
      error:         errorMessage,
    });

  } catch (error: any) {
    console.error('❌ Status error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
