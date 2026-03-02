import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

app.get('/api/avatars', async(req, res) => {
    const response = await fetch('https://api.heygen.com/v2/avatars', {
        headers: {
            'X-Api-Key': process.env.HEYGEN_API_KEY || '',
        },
    });

    const data = await response.json();
    res.json(data);
});

app.post('/api/generate', async(req, res) => {
    const { script, avatar_id, voice_id } = req.body;

    const response = await fetch(
        'https://api.heygen.com/v2/video/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': process.env.HEYGEN_API_KEY || '',
            },
            body: JSON.stringify({
                video_inputs: [{
                    avatar_id,
                    script: {
                        type: 'text',
                        input: script,
                        voice_id,
                    },
                }, ],
            }),
        }
    );

    const data = await response.json();
    res.json(data);
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});