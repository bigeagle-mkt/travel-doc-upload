import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { google } from 'googleapis';
import os from 'os';

// Next.js API config
export const config = {
  api: {
    bodyParser: false,
  },
};

// OAuth2 Credentials (從環境變數讀取)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GOOGLE_FOLDER_ID;
const SHEET_ID = process.env.GOOGLE_SHEET_ID; // 新增 Sheet ID

// LINE Messaging API
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
// 簡易 API 金鑰驗證 (防止濫用)
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'default-secret-key';

// 設定 OAuth2 Client
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

import { appendRow } from '../../lib/googleSheets';

// 寫入 Google Sheets
async function insertIntoDatabase(data) {
  try {
    await appendRow({
      groupId: data.groupId,
      name: data.name,
      phone: data.phone,
      lineUserId: data.lineUserId,
      fileLink: data.fileLink,
    });
    console.log('✅ Google Sheets Append Success');
  } catch (err) {
    console.error('❌ Google Sheets Append Failed:', err);
    // 不拋出錯誤，避免影響前端顯示成功
  }
}

// 使用 Buffer 直接上傳 (不落地)
async function uploadBufferToGoogleDrive(buffer, fileName, mimeType) {
  // 若沒有設定 Google API 憑證，回傳 Mock 網址方便地端測試 SQLite
  if (!REFRESH_TOKEN) {
    console.log('⚠️ 尚未設定 Google API 憑證，略過上傳至 Google Drive');
    return {
      id: 'mock-file-id',
      name: fileName,
      webViewLink: 'https://mock-drive-link.com/' + fileName
    };
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // 轉換 Buffer 為 Readable Stream
  const { Readable } = await import('stream');
  const stream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [FOLDER_ID],
    },
    media: {
      mimeType: mimeType,
      body: stream,
    },
    fields: 'id, name, webViewLink',
  });

  return response.data;
}

// 產生浮水印 SVG (固定尺寸邏輯)
function createWatermarkSvg(width, height, text) {
  // 字體大小：寬度的 5% (確保清晰可見)
  const fontSize = Math.max(24, Math.floor(width * 0.05));

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .watermark { 
            fill: rgba(255, 255, 255, 0.5); 
            font-size: ${fontSize}px; 
            font-family: Arial, sans-serif;
            font-weight: bold;
          }
          .watermark-shadow {
            fill: rgba(0, 0, 0, 0.5);
            font-size: ${fontSize}px;
            font-family: Arial, sans-serif;
            font-weight: bold;
          }
        </style>
      </defs>
      <!-- 陰影 (偏移 2px) -->
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="watermark-shadow" transform="translate(2, 2) rotate(-30, ${width / 2}, ${height / 2})">${text}</text>
      <!-- 主文字 -->
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="watermark" transform="rotate(-30, ${width / 2}, ${height / 2})">${text}</text>
    </svg>
  `);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. 簡易 API 驗證 (Header Check)
  const authHeader = req.headers['x-api-key'];
  if (authHeader !== API_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized: Invalid API Key' });
  }

  // 使用系統暫存目錄 (僅用於接收原始上傳)
  const tmpDir = os.tmpdir();

  const form = formidable({
    uploadDir: tmpDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    filter: ({ mimetype }) => mimetype && mimetype.includes('image'), // 只允許圖片
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Upload Error:', err);
      return res.status(500).json({ error: 'File upload failed: ' + err.message });
    }

    const file = files.file?.[0];
    const name = fields.name?.[0] || 'Unknown';
    const phone = fields.phone?.[0] || 'NoPhone';
    const groupId = fields.groupId?.[0] || 'DEFAULT';
    const lineUserId = fields.lineUserId?.[0] || null;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const originalPath = file.filepath;
      // 檔名規則: 團號_姓名_電話_時間戳.jpg
      const filename = `${groupId}_${name}_${phone}_${Date.now()}.jpg`;

      // 2. 影像處理優化 (In-Memory Buffer)
      // 目標尺寸：寬度 1280px (兼顧清晰度與檔案大小)
      const targetWidth = 1280;

      // 讀取原圖 metadata
      const metadata = await sharp(originalPath).metadata();
      // 計算等比例高度
      const targetHeight = Math.round((metadata.height / metadata.width) * targetWidth);

      // 浮水印文字
      const today = new Date().toISOString().split('T')[0];
      const watermarkText = `僅供 XX 旅遊辦理簽證使用 ${today}`;

      // 產生浮水印 SVG
      const watermarkSvg = createWatermarkSvg(targetWidth, targetHeight, watermarkText);

      // 執行 Sharp 處理：Resize -> Watermark -> Buffer
      const processedBuffer = await sharp(originalPath)
        .resize({ width: targetWidth }) // 自動等比例縮放
        .composite([{
          input: watermarkSvg,
          gravity: 'center',
        }])
        .jpeg({ quality: 80 }) // 80% 品質壓縮
        .toBuffer();

      // 3. 直接上傳 Buffer 到 Google Drive (不落地寫檔)
      console.log('正在上傳到 Google Drive...');
      const driveFile = await uploadBufferToGoogleDrive(processedBuffer, filename, 'image/jpeg');
      console.log('✅ Google Drive Upload Success:', driveFile.webViewLink);

      // 4. 更新資料庫 (SQLite)
      try {
        await insertIntoDatabase({
          groupId: groupId,
          name: name,
          phone: phone,
          lineUserId: lineUserId,
          fileLink: driveFile.webViewLink,
        });
      } catch (dbErr) {
        console.error('Database Update Failed:', dbErr);
      }

      // 5. LINE 通知 (錯誤處理強化)
      if (lineUserId && LINE_CHANNEL_ACCESS_TOKEN) {
        try {
          console.log('正在發送 LINE 訊息給:', lineUserId);
          const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              to: lineUserId,
              messages: [
                {
                  type: 'text',
                  text: `✅ ${name} 您好！\n\n您的證件已上傳成功！\n\n📋 團號：${groupId}\n📱 電話：${phone}\n⏰ 時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}\n\n如有任何問題，請隨時與我們聯繫。感謝您的配合！🙏`,
                },
              ],
            }),
          });

          if (!lineResponse.ok) {
            const lineError = await lineResponse.json();
            console.error('LINE API Error:', lineError);
            // 這裡可以選擇是否回報給管理員
          }
        } catch (lineErr) {
          console.error('LINE Network Error:', lineErr);
        }
      }

      // 清除原始暫存檔 (只刪除 formidable 產生的那個)
      try {
        if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
      } catch (e) {
        console.error('清除暫存檔失敗:', e);
      }

      return res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        driveLink: driveFile.webViewLink
      });

    } catch (error) {
      console.error('Processing Error:', error);
      // 清理殘留檔案
      if (file && fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath);
      return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
    }
  });
}
