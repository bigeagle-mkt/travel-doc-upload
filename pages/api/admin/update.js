import { openDb } from '../../../lib/db';

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
    const db = await openDb();

    // 使用 SQLite 交易 (Transaction) 確保多筆更新的一致性
    await db.run('BEGIN TRANSACTION');

    try {
      const stmt = await db.prepare(
        "UPDATE documents SET status = '已處理', purpose = ?, applyDate = ? WHERE id = ?"
      );

      for (const id of ids) {
        await stmt.run([purpose, applyDate, id]);
      }

      await stmt.finalize();
      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }

    res.status(200).json({ success: true, message: 'Updated successfully' });
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

