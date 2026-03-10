import { openDb } from '../../../lib/db';

const API_SECRET_KEY = process.env.API_SECRET_KEY || 'default-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  // 1. API Key 驗證
  if (req.headers['x-api-key'] !== API_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const db = await openDb();

    // 從 SQLite 讀取所有資料
    const rows = await db.all('SELECT * FROM documents ORDER BY id DESC');

    const data = rows.map((row) => ({
      id: row.id,
      time: row.time,
      groupId: row.groupId,
      name: row.name,
      phone: row.phone,
      lineUserId: row.lineUserId,
      fileLink: row.fileLink,
      status: row.status,
      purpose: row.purpose,
      applyDate: row.applyDate,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('List Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

