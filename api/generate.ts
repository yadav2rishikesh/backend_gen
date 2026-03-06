import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '835028fdeb28a5d7bc0f4413eb5f058b047a7de6e8fba35649e04fc5a797b581';
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": "cgSgspJ2msm6clMCkdW9", // Ekta
  "10483c6d38564597a9491c0dbff9b0dd": "cgSgspJ2msm6clMCkdW9", // Swati
};

// ✅ Use ElevenLabs streaming URL directly — no upload needed!
// ElevenLabs has a public streaming endpoint that returns a direct MP3 URL
async function getElevenLabsStreamUrl(text: string, voiceId: string): Promise<string> {
  console.log(`🎙️ Getting ElevenLabs stream URL | voice: ${voiceId}`);

  // Use ElevenLabs text-to-speech/stream endpoint
  // We call it, get the audio, then re-host via base64 data URI trick
  // OR use the ElevenLabs "with_timestamps" to get a public URL

  // Actually: use ElevenLabs /v1/text-to-speech/{voice_id}/stream
  // and pass it directly as audio_url using a Vercel edge trick
  // BEST approach: store audio in Vercel response cache and return URL

  // Simplest working approach: generate audio and return as base64 data URL
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
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

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`✅ Got ${audioBuffer.length} bytes from ElevenLabs`);
  return audioBuffer.toString('base64');
}

// ✅ Upload to Cloudinary (free, no auth needed for unsigned uploads)
async function uploadToCloudinary(audioBase64: string): Promise<string> {
  console.log('☁️ Uploading to Cloudinary...');
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'demo';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  const formData = new URLSearchParams();
  formData.append('file', `data:audio/mpeg;base64,${audioBase64}`);
  formData.append('upload_preset', uploadPreset);
  formData.append('resource_type', 'video'); // Cloudinary uses 'video' for audio

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    }
  );

  const data = await response.json() as any;
  console.log('Cloudinary response:', JSON.stringify(data).slice(0, 200));

  if (!data.secure_url) throw new Error(`Cloudinary upload failed: ${JSON.stringify(data)}`);
  
  console.log('✅ Cloudinary URL:', data.secure_url);
  return data.secure_url;
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

    const elevenLabsVoiceId = ELEVENLABS_VOICE_MAP[avatar_id];
    let voicePayload: any;

    if (elevenLabsVoiceId) {
      console.log('🇮🇳 ElevenLabs → Cloudinary → HeyGen flow...');
      const audioBase64 = await getElevenLabsStreamUrl(script, elevenLabsVoiceId);
      const audioUrl = await uploadToCloudinary(audioBase64);

      voicePayload = {
        type: 'audio',
        audio_url: audioUrl, // ✅ Public URL — works with HeyGen v4!
      };
    } else {
      console.log('🎤 HeyGen voice directly...');
      voicePayload = {
        type: 'text',
        voice_id: voice_id,
        input_text: script,
        speed: 1.0,
        pitch: 0,
      };
    }

    const payload = {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id,
          avatar_style: 'normal',
        },
        voice: voicePayload,
      }],
      dimension: { width: 1920, height: 1080 },
      avatar_version: 'v4',
      caption: true,
      test: false,
    };

    console.log('→ HeyGen payload:', JSON.stringify(payload).slice(0, 400));

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('HeyGen response:', responseText);

    if (!response.ok) throw new Error(`HeyGen error ${response.status}: ${responseText}`);

    const data = JSON.parse(responseText);
    const video_id = data?.data?.video_id;
    if (!video_id) throw new Error(`No video_id: ${responseText}`);

    console.log('✅ Video started:', video_id);
    return res.status(200).json({ video_id });

  } catch (error: any) {
    console.error('Generate error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate video' });
  }
}
