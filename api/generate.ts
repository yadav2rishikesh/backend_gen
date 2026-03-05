import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {

    console.log("Raw body:", JSON.stringify(req.body));

    const avatar_id: string = req.body?.avatar_id;
    const voice_id: string = req.body?.voice_id;
    const script: string = req.body?.script;

    if (!avatar_id) return res.status(400).json({ error: "Missing avatar_id" });
    if (!voice_id) return res.status(400).json({ error: "Missing voice_id" });
    if (!script) return res.status(400).json({ error: "Missing script" });

    console.log(`Avatar: ${avatar_id} | ElevenLabs voice: ${voice_id}`);

    /* -----------------------------
       STEP 1: Generate voice using ElevenLabs
    ------------------------------ */

    const voiceResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.85
          }
        })
      }
    );

    if (!voiceResponse.ok) {
      const err = await voiceResponse.text();
      throw new Error(`ElevenLabs error: ${err}`);
    }

    const audioBuffer = await voiceResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    console.log("Voice generated successfully");

    /* -----------------------------
       STEP 2: Send audio to HeyGen
    ------------------------------ */

    const payload = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: avatar_id,
            avatar_style: "normal"
          },
          voice: {
            type: "audio",
            audio_data: audioBase64
          }
        }
      ],

      // Try 1080p
      dimension: {
        width: 1920,
        height: 1080
      },

      test: false
    };

    console.log("Sending to HeyGen...");

    const response = await fetch(
      "https://api.heygen.com/v2/video/generate",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-api-key": process.env.HEYGEN_API_KEY || ""
        },
        body: JSON.stringify(payload)
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`HeyGen error ${response.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    const video_id = data?.data?.video_id;

    if (!video_id) {
      throw new Error("HeyGen returned no video_id");
    }

    console.log("Video generation started:", video_id);

    return res.status(200).json({ video_id });

  } catch (error: any) {

    console.error("Generate error:", error);

    return res.status(500).json({
      error: error.message || "Failed to generate video"
    });
  }
}
