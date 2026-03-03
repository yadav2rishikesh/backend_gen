import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { video_id } = req.query;

    if (!video_id) {
      return res.status(400).json({ error: "Missing video_id" });
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
      throw new Error(errorText);
    }

    const data = await response.json();

    const video = data.data;

    return res.status(200).json({
      status: video?.status,
      videoUrl: video?.video_url,
      thumbnailUrl: video?.thumbnail_url,
      duration: video?.duration
    });

  } catch (error: any) {
    console.error("Status Error:", error.message);
    return res.status(500).json({
      error: error.message || "Failed to fetch status"
    });
  }
}
