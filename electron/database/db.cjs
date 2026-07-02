const path = require("path");
const fs = require("fs");

let dbInstance = null;
let useFallback = false;
let jsonDbPath = "";

function initDatabase(app) {
  const userDataPath = app.getPath("userData");
  jsonDbPath = path.join(userDataPath, "memory_fallback.json");

  try {
    const Database = require("better-sqlite3");
    const dbPath = path.join(userDataPath, "pixel_pet_memory.db");
    dbInstance = new Database(dbPath);

    // Bootstrap table architecture
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS conversation_history (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pet_profile (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        species TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        relationship INTEGER DEFAULT 0,
        happiness INTEGER DEFAULT 80,
        energy INTEGER DEFAULT 80,
        hunger INTEGER DEFAULT 80,
        social INTEGER DEFAULT 80,
        curiosity INTEGER DEFAULT 50,
        personality TEXT NOT NULL,
        last_interaction INTEGER NOT NULL
      );
    `);

    // Add columns dynamically in case the DB was already created without them
    try {
      dbInstance.exec(
        "ALTER TABLE pet_profile ADD COLUMN relationship INTEGER DEFAULT 0;",
      );
    } catch (e) {}
    try {
      dbInstance.exec(
        "ALTER TABLE pet_profile ADD COLUMN hunger INTEGER DEFAULT 80;",
      );
    } catch (e) {}
    try {
      dbInstance.exec(
        "ALTER TABLE pet_profile ADD COLUMN social INTEGER DEFAULT 80;",
      );
    } catch (e) {}

    console.log("[Database] Native SQLite initialized at:", dbPath);
  } catch (err) {
    console.warn(
      "[Database] Native SQLite load failed, falling back to JSON storage:",
      err.message,
    );
    useFallback = true;
    if (!fs.existsSync(jsonDbPath)) {
      fs.writeFileSync(
        jsonDbPath,
        JSON.stringify({ conversations: [], profile: null }, null, 2),
      );
    }
  }
}

// ─── DB Access Interfaces ──────────────────────────────────────────────────────

function saveMessage(msg) {
  if (useFallback) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonDbPath, "utf8"));
      data.conversations.push(msg);
      fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("[Database Fallback] Failed saving message:", err);
    }
    return;
  }

  try {
    const stmt = dbInstance.prepare(`
      INSERT OR REPLACE INTO conversation_history (id, session_id, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(msg.id, msg.sessionId, msg.role, msg.content, msg.timestamp);
  } catch (err) {
    console.error("[Database] Failed to insert message:", err);
  }
}

function getMessages(sessionId) {
  if (useFallback) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonDbPath, "utf8"));
      return data.conversations.filter((c) => c.sessionId === sessionId);
    } catch {
      return [];
    }
  }

  try {
    const stmt = dbInstance.prepare(`
      SELECT id, session_id as sessionId, role, content, timestamp
      FROM conversation_history
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `);
    return stmt.all(sessionId);
  } catch (err) {
    console.error("[Database] Load history failed:", err);
    return [];
  }
}

function clearMessages(sessionId) {
  if (useFallback) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonDbPath, "utf8"));
      data.conversations = data.conversations.filter(
        (c) => c.sessionId !== sessionId,
      );
      fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("[Database Fallback] Failed clearing history:", err);
    }
    return;
  }

  try {
    const stmt = dbInstance.prepare(
      `DELETE FROM conversation_history WHERE session_id = ?`,
    );
    stmt.run(sessionId);
  } catch (err) {
    console.error("[Database] Failed to delete history:", err);
  }
}

function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  initDatabase,
  saveMessage,
  getMessages,
  clearMessages,
  closeDatabase,
};
