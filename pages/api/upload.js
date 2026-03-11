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
const CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^"|"$/g, '');
const CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^"|"$/g, '');
const REFRESH_TOKEN = (process.env.GOOGLE_REFRESH_TOKEN || '').trim().replace(/^"|"$/g, '');
const FOLDER_ID = (process.env.GOOGLE_FOLDER_ID || '').trim().replace(/^"|"$/g, '');
const SHEET_ID = (process.env.GOOGLE_SHEET_ID || '').trim().replace(/^"|"$/g, ''); // 新增 Sheet ID

// LINE Messaging API
const LINE_CHANNEL_ACCESS_TOKEN = (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
// 簡易 API 金鑰驗證 (防止濫用)
const API_SECRET_KEY = (process.env.API_SECRET_KEY || 'default-secret-key').trim();

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

// 浮水印設定
const FONT_PATH = path.join(process.cwd(), 'public/fonts/Arial.ttf');

// 產生浮水印 (使用 SVG 避免 Vercel Fontconfig 問題)
async function createWatermark(width, height, text) {
  // 計算字體大小 (約寬度的 5%)
  const fontSize = Math.max(24, Math.floor(width * 0.05));
  
  // 使用 SVG 文字，這在 Vercel 環境通常比 sharp({ text: ... }) 更穩定
  const svgText = `
    <svg width="${width}" height="${height}">
      <style>
        .watermark-text {
          fill: white;
          fill-opacity: 0.5;
          font-size: ${fontSize}px;
          font-family: sans-serif;
          font-weight: bold;
        }
      </style>
      <text 
        x="50%" 
        y="50%" 
        text-anchor="middle" 
        class="watermark-text"
        transform="rotate(-30, ${width/2}, ${height/2})"
      >
        ${text}
      </text>
    </svg>`;

  return Buffer.from(svgText);
}

export default async function handler(req, res) {
  // CORS 預檢請求處理 (CORS Preflight)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.warn(`⚠️ Received forbidden method: ${req.method} on /api/upload`);
    // 在 Vercel 環境中有時 405 會被報成 500，這裡我們試著回傳 405 並加強 Log
    return res.status(405).json({ 
      error: 'Method Not Allowed', 
      method: req.method,
      expected: 'POST'
    });
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

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      console.log('>>> [Step 1] Form parsing started');
      if (err) {
        console.error('❌ [Error] Formidable parse error:', err);
        res.status(500).json({ 
          error: 'Form parsing failed', 
          message: err.message,
          stack: err.stack 
        });
        return resolve();
      }

      console.log('>>> [Step 2] Form parsed successfully. Fields:', Object.keys(fields));
      const file = files.file?.[0];
      const name = fields.name?.[0] || 'Unknown';
      const phone = fields.phone?.[0] || 'NoPhone';
      const groupId = fields.groupId?.[0] || 'DEFAULT';
      const lineUserId = fields.lineUserId?.[0] || null;

      if (!file) {
        console.error('❌ [Error] No file found in request');
        res.status(400).json({ error: 'No file uploaded' });
        return resolve();
      }
      console.log(`>>> [Step 3] File received: ${file.originalFilename}, Size: ${file.size}`);

      try {
        const originalPath = file.filepath;
        // 檔名規則: 團號_姓名_電話_時間戳.jpg
        const filename = `${groupId}_${name}_${phone}_${Date.now()}.jpg`;

        // 2. 影像處理優化 (In-Memory Buffer)
        console.log('>>> [Step 4] Starting Image Processing (Sharp)');
        const targetWidth = 1280;

        // 讀取原圖 metadata
        const metadata = await sharp(originalPath).metadata();
        console.log(`>>> [Step 4.1] Original metadata: ${metadata.width}x${metadata.height}`);

        const targetHeight = Math.round((metadata.height / metadata.width) * targetWidth);

        const today = new Date().toISOString().split('T')[0];
        const watermarkText = `僅供 XX 旅遊辦理簽證使用 ${today}`;

        // 產生浮水印
        console.log('>>> [Step 4.2] Creating Watermark SVG');
        const watermark = await createWatermark(targetWidth, targetHeight, watermarkText);

        // 執行 Sharp 處理
        console.log('>>> [Step 4.3] Applying Watermark and Resizing');
        let processedBuffer;
        try {
          processedBuffer = await sharp(originalPath)
            .resize({ width: targetWidth }) // 自動等比例縮放
            .composite([{
              input: watermark,
              gravity: 'center',
            }])
            .jpeg({ quality: 80 }) // 80% 品質壓縮
            .toBuffer();
        } catch (sharpError) {
          throw new Error('Sharp processing failed: ' + sharpError.message);
        }

        // 3. 診斷與上傳 (v1.0.6)
        console.log('--- Request Diagnostic (v1.0.6) ---');
        console.log(`FILENAME: ${filename}`);
        console.log(`CLIENT_ID: len=${CLIENT_ID.length}, head=${CLIENT_ID.substring(0, 5)}...`);
        console.log(`CLIENT_SECRET: len=${CLIENT_SECRET.length}, head=${CLIENT_SECRET.substring(0, 3)}, tail=${CLIENT_SECRET.substring(CLIENT_SECRET.length - 3)}`);
        console.log(`REFRESH_TOKEN: len=${REFRESH_TOKEN.length}`);
        console.log(`FOLDER_ID: ${FOLDER_ID}`);
        console.log(`SHEET_ID: ${SHEET_ID}`);
        console.log('--- End Request Diagnostic ---');

        console.log('正在上傳到 Google Drive...');
        let driveFile;
        try {
          driveFile = await uploadBufferToGoogleDrive(processedBuffer, filename, 'image/jpeg');
          console.log('✅ Google Drive Upload Success:', driveFile.webViewLink);
        } catch (driveError) {
          throw new Error('Google Drive upload failed: ' + driveError.message);
        }

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

        // 清除原始暫存檔
        try {
          if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
            console.log('>>> [Step 8] Temporary file cleaned up');
          }
        } catch (e) {
          console.error('⚠️ 清除暫存檔失敗:', e);
        }

        console.log('>>> [Step 9] Request finished successfully');
        res.status(200).json({
          success: true,
          message: 'File uploaded successfully',
          driveLink: driveFile.webViewLink
        });
        return resolve();

      } catch (error) {
        console.error('❌ [Crucial Error] Global Catch:', error);
        // 清理殘留檔案
        try {
          if (file && file.filepath && fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
          }
        } catch (e) {
          console.error('清理失敗:', e);
        }
        
        // 詳細回報錯誤給前端
        res.status(500).json({ 
          error: 'Internal Server Error',
          message: error.message,
          stack: error.stack, // 一律回傳 stack 協助 Debug (正式環境穩定後可移除)
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        return resolve();
      }
    });
  });
}
