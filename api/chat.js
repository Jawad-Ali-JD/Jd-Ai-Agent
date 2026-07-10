export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is not configured with an API key.' });
  }

  const { system, messages, image } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages array.' });
  }

  // Gemini uses 'model' instead of 'assistant' for the AI's turns.
  const contents = messages.slice(-16).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  // If a photo was attached, add it as inline image data to the final (current) user turn.
  if (image && image.base64 && image.mimeType) {
    const lastEntry = contents[contents.length - 1];
    if (lastEntry && lastEntry.role === 'user') {
      lastEntry.parts.push({
        inline_data: { mime_type: image.mimeType, data: image.base64 }
      });
    }
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: system || '' }] }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(502).json({ error: data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return res.status(502).json({ error: 'No response from model.' });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Gemini API.' });
  }
}

