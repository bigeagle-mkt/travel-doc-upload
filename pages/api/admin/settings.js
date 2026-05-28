import { getSettings, updateSettings } from '../../../lib/googleSheets';

const API_SECRET_KEY = (process.env.API_SECRET_KEY || 'default-secret-key').trim();

export default async function handler(req, res) {
  // 驗證 API Key
  const authHeader = req.headers['x-api-key'];
  if (authHeader !== API_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized: Invalid API Key' });
  }

  if (req.method === 'GET') {
    try {
      const settings = await getSettings();
      return res.status(200).json({ success: true, settings });
    } catch (error) {
      console.error('Fetch settings failed:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { watermark_enabled, watermark_text } = req.body;
      
      // 基本驗證
      if (watermark_enabled === undefined || watermark_text === undefined) {
        return res.status(400).json({ success: false, error: 'Missing parameters' });
      }

      await updateSettings({
        watermark_enabled: String(watermark_enabled),
        watermark_text: String(watermark_text)
      });

      return res.status(200).json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Update settings failed:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
