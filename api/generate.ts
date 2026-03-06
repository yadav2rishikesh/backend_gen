import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '835028fdeb28a5d7bc0f4413eb5f058b047a7de6e8fba35649e04fc5a797b581';

// ✅ Best Indian English female voice on ElevenLabs
// "Aria" - Indian English accent, natural and clear
const INDIAN_FEMALE_VOICE_ID = 'XB0fDUnXU5powFXDhCwa'; // Charlotte - warm
const INDIAN_VOICE_MAP: Record<string, string> = {
  // Female avatars → Indian female voice
  "23a8ea2ea0294fe68b0f1f514081bf1d": "cgSgspJ2msm6clMCkdW9", // Ekta → Jessica (Indian)
  "10483c6d38564597a9491c0dbff9b0dd": "cgSgspJ2msm6clMCkdW9", // Swati → Jessica (Indian)
  // Male avatars → their HeyGen matched voice (keep as text)
  "13c1f299bc854ed697ccf2c5a64218f9": null, // Nikhil → use HeyGen voice
  "621f9f7e33584a61a6a42d2d4e6b224c": null, // Nikhil → use HeyGen voice
  "b65c8b326bd546aba0edf4f4be65f37e": null, // Manish → use HeyGen voice
};

async function generateElevenLabsAudio(text: string, voiceId: string): Promise<Buffer> {
  console.log(`🎙️ Generating ElevenLabs audio | voice: ${voiceId} | text: "${text.slice(0, 50)}..."`);
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2', // ✅ Best model for Indian accent
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${err}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const avatar_id: string = req.body?.avatar_id;
    const voice_id: string = req.body?.voice_id;
    const script: string = req.body?.script;

    console.log(`avatar_id="${avatar_id}" voice_id="${voice_id}" script="${script?.slice(0, 50)}"`);

    if (!avatar_id) return res.status(400).json({ error: 'Missing avatar_id' });
    if (!voice_id)  return res.status(400).json({ error: 'Missing voice_id' });
    if (!script)    return res.status(400).json({ error: 'Missing script' });

    // ✅ Check if this avatar should use ElevenLabs
    const elevenLabsVoiceId = INDIAN_VOICE_MAP[avatar_id];
    const useElevenLabs = elevenLabsVoiceId !== null && elevenLabsVoiceId !== undefined && avatar_id in INDIAN_VOICE_MAP;

    let voicePayload: any;

    if (useElevenLabs && elevenLabsVoiceId) {
      // ✅ Generate audio via ElevenLabs first
      console.log('🇮🇳 Using ElevenLabs for Indian accent...');
      const audioBuffer = await generateElevenLabsAudio(script, elevenLabsVoiceId);
      const audioBase64 = audioBuffer.toString('base64');

      voicePayload = {
        type: 'audio',
        audio_base64: audioBase64,
        name: 'elevenlabs_audio',
      };
      console.log('✅ ElevenLabs audio generated, sending to HeyGen...');
    } else {
      // Use HeyGen voice directly for male avatars
      console.log('🎤 Using HeyGen voice directly...');
      voicePayload = {
        type: 'text',
        voice_id: voice_id,
        input_text: script,
        speed: 1.0,
        pitch: 0,
      };
    }

    const payload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: avatar_id,
            avatar_style: 'normal',
          },
          voice: voicePayload,
        },
      ],
      dimension: { width: 1920, height: 1080 }, // ✅ Full HD
      avatar_version: 'v4',
      caption: true, // ✅ Auto captions
      test: false,
    };

    console.log('Sending to HeyGen:', JSON.stringify(payload).slice(0, 300));

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': process.env.HEYGEN_API_KEY || '',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('HeyGen raw response:', responseText);

    if (!response.ok) {
      throw new Error(`HeyGen error ${response.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    const video_id = data?.data?.video_id;
    if (!video_id) throw new Error(`No video_id in response: ${responseText}`);

    console.log('✅ Video generation started:', video_id);
    return res.status(200).json({ video_id });

  } catch (error: any) {
    console.error('Generate error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate video' });
  }
}
