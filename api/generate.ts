import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '835028fdeb28a5d7bc0f4413eb5f058b047a7de6e8fba35649e04fc5a797b581';
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

// ✅ Female avatars use ElevenLabs, male use HeyGen directly
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

// ✅ Step 2: Upload audio to HeyGen and get asset_id
async function uploadAudioToHeyGen(audioBuffer: Buffer): Promise<string> {
  console.log('📤 Uploading audio to HeyGen...');
  
  // Convert buffer to blob-like for fetch
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  formData.append('file', blob, 'voice.mp3');
  formData.append('type', 'audio');

  const response = await fetch('https://upload.heygen.com/v1/asset', {
    method: 'POST',
    headers: {
      'x-api-key': HEYGEN_API_KEY,
    },
    body: formData,
  });

  const responseText = await response.text();
  console.log('HeyGen upload response:', responseText);

  if (!response.ok) {
    throw new Error(`HeyGen upload error ${response.status}: ${responseText}`);
  }

  const data = JSON.parse(responseText);
  const asset_id = data?.data?.id || data?.id;
  if (!asset_id) throw new Error(`No asset_id returned: ${responseText}`);
  
  console.log('✅ Audio uploaded, asset_id:', asset_id);
  return asset_id;
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
      // ✅ ElevenLabs flow: generate → upload → use asset_id
      console.log('🇮🇳 Using ElevenLabs Indian voice...');
      const audioBuffer = await generateElevenLabsAudio(script, elevenLabsVoiceId);
      const asset_id = await uploadAudioToHeyGen(audioBuffer);

      voicePayload = {
        type: 'audio',
        audio_asset_id: asset_id, // ✅ Correct field!
      };
    } else {
      // Male avatars — use HeyGen voice directly
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
      dimension: { width: 1920, height: 1080 },
      avatar_version: 'v4',
      caption: true,
      test: false,
    };

    console.log('Sending to HeyGen:', JSON.stringify(payload).slice(0, 300));

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
