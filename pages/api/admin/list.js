import { getRows } from '../../../lib/googleSheets';

const API_SECRET_KEY = process.env.API_SECRET_KEY || 'default-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  // 1. API Key 驗證
  if (req.headers['x-api-key'] !== API_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    // 從 Google Sheets 讀取所有資料
    const rows = await getRows();

    const data = rows.map((row) => ({
      ...row,
      id: row._rowNumber // Overwrite id to be the rowNumber for stable updates
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('List Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

