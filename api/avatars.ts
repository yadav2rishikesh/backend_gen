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

  try {
    const response = await fetch(
      'https://api.heygen.com/v2/avatars',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.HEYGEN_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();

    return res.status(200).json(data.data?.avatars || []);

  } catch (error: any) {
    console.error("Avatar Fetch Error:", error.message);
    return res.status(500).json({
      error: error.message || "Failed to fetch avatars"
    });
  }
}
