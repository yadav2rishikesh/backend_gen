import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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
      throw new Error(errorText);
    }

    const data = await response.json();

    return res.status(200).json({
      video_id: data.data?.video_id
    });

  } catch (error: any) {
    console.error("Generate Error:", error.message);
    return res.status(500).json({
      error: error.message || "Failed to generate video"
    });
  }
}
