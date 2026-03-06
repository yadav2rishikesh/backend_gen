import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '835028fdeb28a5d7bc0f4413eb5f058b047a7de6e8fba35649e04fc5a797b581';
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

// ✅ Female avatars → ElevenLabs Indian voice
const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  "23a8ea2ea0294fe68b0f1f514081bf1d": "cgSgspJ2msm6clMCkdW9", // Ekta → Jessica Indian
  "10483c6d38564597a9491c0dbff9b0dd": "cgSgspJ2msm6clMCkdW9", // Swati → Jessica Indian
};

// ✅ Step 1: Generate audio from ElevenLabs
async function generateElevenLabsAudio(text: string, voiceId: string): Promise<Buffer> {
  console.log(`🎙️ ElevenLabs | voice: ${voiceId}`);
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
  return Buffer.from(await response.arrayBuffer());
}

// ✅ Step 2: Upload audio buffer to HeyGen
// Response: { code: 100, data: { id: "...", url: "...", file_type: "audio" } }
async function uploadAudioToHeyGen(audioBuffer: Buffer): Promise<{ id: string; url: string }> {
  console.log(`📤 Uploading ${audioBuffer.length} bytes to HeyGen...`);

  // Build raw multipart/form-data manually (most reliable in Node.js)
  const boundary = `----FormBoundary${Date.now()}`;
  const filename = 'voice.mp3';
  const contentType = 'audio/mpeg';

  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, audioBuffer, footer]);

  const response = await fetch('https://upload.heygen.com/v1/asset', {
    method: 'POST',
    headers: {
      'x-api-key': HEYGEN_API_KEY,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(body.length),
    },
    body,
  });

  const responseText = await response.text();
  console.log('HeyGen upload response:', responseText);

  if (!response.ok) {
    throw new Error(`HeyGen upload error ${response.status}: ${responseText}`);
  }

  const data = JSON.parse(responseText);
  const id = data?.data?.id;
  const url = data?.data?.url;

  if (!id && !url) throw new Error(`No id/url in upload response: ${responseText}`);
  console.log(`✅ Uploaded | id: ${id} | url: ${url}`);
  return { id, url };
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
      console.log('🇮🇳 ElevenLabs → HeyGen flow...');
      const audioBuffer = await generateElevenLabsAudio(script, elevenLabsVoiceId);
      const { id, url } = await uploadAudioToHeyGen(audioBuffer);

      // Use audio_url if available (works better with v4), else audio_asset_id
      voicePayload = url
        ? { type: 'audio', audio_url: url }
        : { type: 'audio', audio_asset_id: id };

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

    console.log('→ HeyGen generate payload:', JSON.stringify(payload).slice(0, 400));

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
    console.log('HeyGen generate response:', responseText);

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
