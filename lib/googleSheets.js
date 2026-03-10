import { google } from 'googleapis';

// Reuse existing OAuth2 Credentials from environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

let sheetsClient = null;

// Initialize Google Sheets API Client
function getSheetsClient() {
    if (!sheetsClient) {
        const oauth2Client = new google.auth.OAuth2(
            CLIENT_ID,
            CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
        );
        oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
        sheetsClient = google.sheets({ version: 'v4', auth: oauth2Client });
    }
    return sheetsClient;
}

/**
 * Appends a new user submission as a row in the Google Sheet.
 * Maps directly to the expected column headers.
 */
export async function appendRow(data) {
    if (!SHEET_ID) {
        console.warn('⚠️ GOOGLE_SHEET_ID is not defined, skipping sheet update.');
        return;
    }

    const sheets = getSheetsClient();
    const time = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    // Create a pseudo-ID (we'll rely on row number for absolute ID later, 
    // but a timestamp is useful for immediate insertion).
    const id = Date.now().toString();

    const values = [
        [
            id,                  // A: id
            time,                // B: time
            data.groupId || '',  // C: groupId
            data.name || '',     // D: name
            data.phone || '',    // E: phone
            data.lineUserId || '',// F: lineUserId
            data.fileLink || '', // G: fileLink
            '待處理',            // H: status (default)
            '',                  // I: purpose (empty initially)
            ''                   // J: applyDate (empty initially)
        ]
    ];

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:J',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
        });
        console.log('✅ Google Sheets Append Success');
    } catch (error) {
        console.error('❌ Google Sheets Append Failed:', error);
        throw error;
    }
}

/**
 * Retrieves all rows from the Google Sheet.
 */
export async function getRows() {
    if (!SHEET_ID) {
        console.warn('⚠️ GOOGLE_SHEET_ID is not defined, returning empty list.');
        return [];
    }

    const sheets = getSheetsClient();
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:J',
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) return []; // Empty or only headers

        // Skip the first row (headers) and map the rest
        // We pass `rowNumber` to keep a stable reference for updates.
        const data = rows.slice(1).map((row, index) => {
            // Row number in Google Sheets (1-indexed, starting after header row 1)
            const rowNumber = index + 2;
            return {
                _rowNumber: rowNumber,
                id: row[0] || '',
                time: row[1] || '',
                groupId: row[2] || '',
                name: row[3] || '',
                phone: row[4] || '',
                lineUserId: row[5] || '',
                fileLink: row[6] || '',
                status: row[7] || '待處理',
                purpose: row[8] || '',
                applyDate: row[9] || '',
            };
        });

        // Sort descending by time (simulating ORDER BY id DESC)
        return data.reverse();

    } catch (error) {
        console.error('❌ Google Sheets Get Rows Failed:', error);
        throw error;
    }
}

/**
 * Batch updates specific rows with new status, purpose, and applyDate.
 * Expects `updates` to be an array of objects: 
 * [{ rowNumber: number, purpose: string, applyDate: string }]
 */
export async function updateRows(updates) {
    if (!SHEET_ID || !updates || updates.length === 0) return;

    const sheets = getSheetsClient();
    const data = updates.map(update => ({
        // Update H, I, J columns for the specific row
        // H = Status, I = Purpose, J = ApplyDate
        range: `Sheet1!H${update.rowNumber}:J${update.rowNumber}`,
        values: [['已處理', update.purpose || '', update.applyDate || '']]
    }));

    try {
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SHEET_ID,
            requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: data,
            },
        });
        console.log('✅ Google Sheets Batch Update Success');
    } catch (error) {
        console.error('❌ Google Sheets Batch Update Failed:', error);
        throw error;
    }
}
