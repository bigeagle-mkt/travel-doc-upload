import { updateRows } from '../../../lib/googleSheets';

const API_SECRET_KEY = process.env.API_SECRET_KEY || 'default-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // 1. API Key 驗證
  if (req.headers['x-api-key'] !== API_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { ids, purpose, applyDate } = req.body;
  if (!ids || ids.length === 0) return res.status(400).json({ error: 'Missing data' });

  try {
    const updates = ids.map(id => ({
      // In the new Google Sheets implementation, `id` from frontend is actually the `_rowNumber`
      // We need to ensure we pass it correctly to updateRows
      rowNumber: parseInt(id, 10),
      purpose,
      applyDate
    }));

    await updateRows(updates);

    res.status(200).json({ success: true, message: 'Updated successfully' });
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

