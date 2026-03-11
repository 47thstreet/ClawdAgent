const { apiCall } = require('./_proxy');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const d = await apiCall('/whatsapp/broadcast', 'POST', req.body);
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
