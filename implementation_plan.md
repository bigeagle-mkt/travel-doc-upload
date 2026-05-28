# 實作計畫 (Implementation Plan) - 旅遊證件上傳系統

## 目標描述
分析目前「旅遊證件上傳系統」的程式碼結構，並建立完整的開發與維護文件，確保系統邏輯與安全考量能被有效傳承。

## 使用者審閱項目 (User Review Required)
> [!IMPORTANT]
> - **浮水印文字自訂化**：目前的浮水印文字「僅供 XX 旅遊辦理簽證使用」是寫死在程式碼中的。建議評估未來是否需要提供後台介面或環境變數來彈性修改此文字。
> - **個資安全建議**：目前 Google Drive 的檔名包含姓名與電話，雖然方便管理，但建議確認 Google Drive 資料夾的權限控管是否僅限業務相關人員，以符合個資保護規範。

## 建議變更內容 (Proposed Changes)
本系統主要由以下組件構成，已完成相關規格紀錄：

### 核心 API 層
#### [MODIFY] [pages/api/upload.js](file:///Users/flag/Documents/GitHub/travel-doc-upload/pages/api/upload.js)
- 影像處理：使用 Sharp 進行 1280px 等比例縮放與浮水印合成。
- 雲端上傳：串接 Google Drive API 進行 Buffer 上傳。
- 資料庫更新：完成影像上傳後同步更新 Google Sheets。
- LINE 通知：處理完成後發送推播給指定的 LineUserId。

### 輔助工具層
#### [MODIFY] [lib/googleSheets.js](file:///Users/flag/Documents/GitHub/travel-doc-upload/lib/googleSheets.js)
- 封裝 Google Sheets 的 append 操作，用於記錄使用者上傳資訊。

## 驗證計畫 (Verification Plan)
### 自動化測試
- 呼叫 `/api/upload` 介面，驗證回傳的 `driveLink` 是否能正常開啟處理後的影像。
- 檢查影像寬度是否為 1280px。

### 手動驗證
- 從前端頁面執行完整上傳流程。
- 確認 Google Drive 資料夾與 Google Sheets 中出現正確對應的內容。
- 確認 LINE 訊息推播功能正常運作。

---
*檔案由 Antigravity 助手產生於 2026-03-19*
