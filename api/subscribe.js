export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = process.env.BREVO_LIST_ID;

  if (!apiKey || !listId) {
    // Fail silently from the frontend's perspective — this should never block signup.
    return res.status(200).json({ skipped: true, reason: 'Brevo not configured' });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Missing email.' });
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        email,
        listIds: [parseInt(listId, 10)],
        updateEnabled: true // if the contact already exists, just add them to the list
      })
    });

    // Brevo returns 204 on success, or 400 with "Contact already exist" — both are fine outcomes here.
    if (response.status === 204 || response.status === 201) {
      return res.status(200).json({ added: true });
    }

    const data = await response.json().catch(() => ({}));
    if (data.code === 'duplicate_parameter') {
      return res.status(200).json({ added: true, alreadyExisted: true });
    }

    return res.status(200).json({ added: false, detail: data.message || 'Unknown Brevo response' });

  } catch (err) {
    // Never let a Brevo failure break the signup flow itself.
    return res.status(200).json({ added: false, error: 'Failed to reach Brevo.' });
  }
}
