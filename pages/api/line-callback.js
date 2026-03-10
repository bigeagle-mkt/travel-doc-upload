// LINE Login 回調處理
import { google } from 'googleapis';

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code' });
  }

  try {
    // 交換 code 取得 access token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://travel-doc-upload.vercel.app'}/api/line-callback`,
        client_id: process.env.LINE_CHANNEL_ID,
        client_secret: process.env.LINE_CHANNEL_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('LINE Token Error:', tokenData);
      return res.redirect('/?error=line_auth_failed');
    }

    // 取得用戶資料
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profile = await profileResponse.json();

    if (!profile.userId) {
      return res.redirect('/?error=profile_failed');
    }

    // 將用戶資料透過 query string 傳回前端
    const params = new URLSearchParams({
      lineUserId: profile.userId,
      lineName: profile.displayName || '',
      linePicture: profile.pictureUrl || '',
    });

    res.redirect(`/?${params.toString()}`);

  } catch (error) {
    console.error('LINE Callback Error:', error);
    res.redirect('/?error=line_error');
  }
}
