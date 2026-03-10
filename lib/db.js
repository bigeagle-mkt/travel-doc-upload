import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// Define the path to the SQLite database file
const dbPath = path.join(process.cwd(), 'database.sqlite');

let dbInstance = null;

export async function openDb() {
    if (dbInstance) {
        return dbInstance;
    }

    // Open the database connection
    dbInstance = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    // Initialize the database schema if it doesn't exist
    await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT NOT NULL,
      groupId TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      lineUserId TEXT,
      fileLink TEXT NOT NULL,
      status TEXT DEFAULT '待處理',
      purpose TEXT,
      applyDate TEXT
    )
  `);

    return dbInstance;
}
