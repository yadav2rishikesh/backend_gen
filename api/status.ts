// import type { VercelRequest, VercelResponse } from '@vercel/node';

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

//   if (req.method === 'OPTIONS') return res.status(200).end();

//   try {
//     const { video_id } = req.query;
//     if (!video_id) {
//       return res.status(400).json({ error: 'Missing video_id' });
//     }

//     const response = await fetch(
//       `https://api.heygen.com/v1/video_status.get?video_id=${video_id}`,
//       {
//         headers: {
//           'X-Api-Key': process.env.HEYGEN_API_KEY || '',
//         },
//       }
//     );

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`HeyGen Error: ${errorText}`);
//     }

//     const data = await response.json();

//     // ✅ Log FULL response so we can see the real failure reason
//     console.log('Full status response for', video_id, ':', JSON.stringify(data));

//     const status = data.data?.status;
//     const errorMsg = data.data?.error ?? data.error ?? null;

//     // ✅ If failed, log the actual HeyGen error message
//     if (status === 'failed') {
//       console.error(`Video ${video_id} FAILED. HeyGen error:`, errorMsg);
//     }

//     return res.status(200).json({
//       status,
//       video_url: data.data?.video_url,
//       thumbnail_url: data.data?.thumbnail_url,
//       duration: data.data?.duration,
//       // ✅ Pass the real error message to frontend
//       error: errorMsg,
//     });

//   } catch (error: any) {
//     console.error('Status error:', error);
//     return res.status(500).json({ error: 'Failed to get video status' });
//   }
// }

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

    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${video_id}`,
      {
        headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY || '' },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HeyGen ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Status [${video_id}]:`, JSON.stringify(data?.data));

    const status    = data?.data?.status ?? 'unknown';
    const video_url = data?.data?.video_url ?? null;
    const error     = data?.data?.error ?? null;

    // ── Readable error string ────────────────────────────────
    let errorMessage: string | null = null;
    if (error) {
      if (typeof error === 'string') errorMessage = error;
      else errorMessage = error.message || error.code || JSON.stringify(error);
    }

    if (status === 'failed') {
      console.error(`❌ Video ${video_id} failed:`, errorMessage);
    }
    if (status === 'completed') {
      console.log(`✅ Video ${video_id} ready:`, video_url);
    }

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