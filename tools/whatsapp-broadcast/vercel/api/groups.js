const { apiCall } = require('./_proxy');

module.exports = async (req, res) => {
  try {
    const d = await apiCall('/whatsapp/groups');
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
