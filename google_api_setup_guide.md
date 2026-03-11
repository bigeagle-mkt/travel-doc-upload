# Google Drive 與 Google Sheets API 設定與使用指南

這份文件記錄了如何設定 Google API，讓應用程式能夠上傳圖片（如護照/身分證）到 Google Drive，並將相關資料寫入指定的 Google Sheet。

## 1. 準備工作 (Google Cloud Console)

### 1-1. 建立專案並啟用 API
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 建立一個新的專案（或是選擇現有的專案，例如您的 `277155983320` 專案）。
3. 進入**「API 和服務」** > **「程式庫」**。
4. 搜尋並啟用以下兩個 API：
   - **Google Drive API**
   - **Google Sheets API**

### 1-2. 取得 OAuth 憑證 (Client ID & Secret)
1. 進入**「API 和服務」** > **「憑證」**。
2. 點擊 **「建立憑證」** > **「OAuth 用戶端 ID」**。
   *(如果尚未設定「OAuth 同意畫面」，系統會要求您設定。選擇「外部」，填入必填名稱與信箱即可)。*
3. 應用程式類型選擇 **「網頁應用程式」**。
4. 在 **「已授權的重新導向 URI」** 加入 Google OAuth Playground 的網址：
   `https://developers.google.com/oauthplayground`
5. 點擊建立後，您會獲得 **`Client ID` (用戶端編號)** 和 **`Client Secret` (用戶端密碼)**。

### 1-3. 取得 Refresh Token
為了讓伺服器能無須人工介入持續上傳，我們需要取得一組永久有效的 Refresh Token：
1. 前往 [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)。
2. 點擊右上角 **齒輪圖示 (OAuth 2.0 configuration)**，勾選 **「Use your own OAuth credentials」**。
3. 填入剛剛取得的 `Client ID` 和 `Client Secret`。
4. 在左側 **Step 1** 底部的 `Input your own scopes` 文字框中填入：
   `https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets`
5. 點擊 **Authorize APIs** 並登入您的 Google 帳號授權。
6. 跳轉後進入 **Step 2**，點擊 **Exchange authorization code for tokens**。
7. 從回應中複製出 **`Refresh token`**。

---

## 2. 準備目的地 (Google Drive & Sheets)

### 2-1. 準備 Google Drive 資料夾
1. 在您的 Google 雲端硬碟中，建立一個新資料夾（例如：`旅客證件上傳區`）。
2. 對該資料夾點擊右鍵 > **「共用」** > 將一般存取權設為**「知道連結的任何人」**（如果您希望上傳的圖片有預覽連結）。
3. 從網址列取得 Folder ID：
   例如 `https://drive.google.com/drive/folders/19anq2kwofMYEym4a9ys5I_xsmtr9opR_`，後面的英數亂碼即為 **`Folder ID`**。

### 2-2. 準備 Google Sheet (試算表)
1. 建立一個新的 Google 試算表。
2. (建議) 在第一列 (Row 1) 建立標題欄位：
   `ID | 時間 | 團號 | 姓名 | 電話 | LINE ID | 檔案連結 | 狀態 | 用途 | 申請日期`
3. 從網址列取得 Sheet ID：
   例如 `https://docs.google.com/spreadsheets/d/1DBHsPwiDoK_s33F8OO2SPTUk-2DWPrTPb4mAaVcChhk/edit`，引號中間的英數即為 **`Sheet ID`**。

---

## 3. 環境變數設定

在 Next.js 專案根目錄下的 `.env.local` 檔案中，填入上述取得的各項資訊：

```env
# Google OAuth 憑證
GOOGLE_CLIENT_ID=您的_CLIENT_ID
GOOGLE_CLIENT_SECRET=您的_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN="您的_REFRESH_TOKEN"

# 儲存目標位置
GOOGLE_FOLDER_ID=您的_FOLDER_ID
GOOGLE_SHEET_ID=您的_SHEET_ID
```

---

## 4. 程式邏輯說明

本系統的上傳邏輯統一實作於 `pages/api/upload.js`：

1. **接收前端資料**：使用 `formidable` 套件接收含有圖片與表單文字（姓名、團號等）的多重表單資料 (`multipart/form-data`)。
2. **圖片處理與浮水印**：利用 `sharp` 將圖片自動等比例縮小並壓上浮水印，轉換為 Buffer 資料（不儲存於伺服器硬碟，減少磁碟消耗與資安風險）。
3. **上傳至 Google Drive**：
   - 透過 `google.auth.OAuth2` 設定 OAuth2 用戶端，並自動刷新 Token。
   - 呼叫 `drive.files.create` 將圖片 Buffer 上傳到指定的 Folder ID 中。
   - 取得並回傳該檔案的預覽連結 (`webViewLink`)。
4. **寫入 Google Sheets 紀錄**：
   - 呼叫 `lib/googleSheets.js` 中的 `appendRow` 函式。
   - 將包含新檔案連結 (`webViewLink`) 和使用者輸入的個資（姓名、電話等），以新資料列 Append 到 Sheet 結尾。

---

## 5. 常見錯誤排除 (Troubleshooting)

- **`403: Google Sheets API has not been used in project...`**
  - 原因：您的 Google Cloud 專案未前往 API Console 啟用 Google Sheets API。
  - 解決：點擊錯誤訊息內附帶的網址，前往介面點選「啟用」。
  
- **`invalid_grant` (HTTP 500 in `/api/upload`)**
  - 原因：`.env.local` 中的 `GOOGLE_REFRESH_TOKEN` 已經失效（密碼變更、授權被撤除或太久未使用）。
  - 解決：請重新前往 OAuth Playground 執行「Step 1-3」產生新的 Refresh Token 並更新環境變數。

- **`File not found` (寫入試算表或資料夾失敗)**
  - 原因：如果該 Drive 資料夾或試算表是別人建立的，且沒有將編輯權限開給您的 Google 帳號。使用的 Refresh Token 帳號必須具備該目標資料夾/檔案的「編輯權限」。
