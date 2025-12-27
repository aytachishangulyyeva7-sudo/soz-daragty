 import initSqlJs from 'sql.js';
import localforage from 'localforage';
import { sendUpdate } from '../utils/WebSocketClient';
let db: any = null;
let dbVersion = 0;

export const generateId = () => crypto.randomUUID();

const broadcast = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('lingo-db-updates')
  : null;

if (broadcast) {
  broadcast.onmessage = () => {
    dbVersion++;
    localStorage.setItem('dbVersion', dbVersion.toString());
  };
}

const incrementVersion = () => {
  dbVersion++;
  localStorage.setItem('dbVersion', dbVersion.toString());
  if (broadcast) broadcast.postMessage('db-updated');
  sendUpdate();};

export const getDbVersion = () => dbVersion;

const getDb = async () => {
  if (db) return db;

  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });

  const saved = await localforage.getItem<ArrayBuffer>('lingoDb');
  if (saved) {
    db = new SQL.Database(new Uint8Array(saved));
    console.log('✅ DB ýüklendi');
  } else {
    db = new SQL.Database();
    console.log('🆕 Täze DB döredildi');

    db.exec(`
      CREATE TABLE words (
        id TEXT PRIMARY KEY,
        word TEXT UNIQUE NOT NULL,
        length INTEGER NOT NULL,
        starting_letter TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'tm'
      );
      CREATE INDEX idx_words_length ON words(length);
      CREATE INDEX idx_words_starting ON words(starting_letter);
      CREATE INDEX idx_words_language ON words(language);

      CREATE TABLE game_sessions (
        id TEXT PRIMARY KEY,
        current_round INTEGER DEFAULT 1,
        current_group_id TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE groups (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        turn_order INTEGER NOT NULL
      );

      CREATE TABLE game_state (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        group_id TEXT NOT NULL,
        current_word TEXT,
        current_word_id TEXT,
        timer_active INTEGER DEFAULT 0,
        timer_started_at TEXT,
        attempts_used INTEGER DEFAULT 0,
        guesses TEXT DEFAULT '[]',
        round_config TEXT DEFAULT '{"starting_points":120,"penalty":20}',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, group_id)
      );
    `);

    // Başlangyç sözler (10 TM + 10 EN)
    const initialWords = [
      // Türkmençe
      ["ABAT", 4, "A", "tm"],
["BABA", 4, "B", "tm"],
["ÇAGA", 4, "Ç", "tm"],
 ["ПОЛКА", 5, "П", "ru"],
  ["ВАЗА", 4, "В", "ru"],
  ["ЧАШКА", 5, "Ч", "ru"],
  ["ЛОЖКА", 5, "Л", "ru"],
  ["ВИЛКА", 5, "В", "ru"],
  ["ПОРОГ", 5, "П", "ru"],
    ];

    const stmt = db.prepare(
      "INSERT OR IGNORE INTO words (id, word, length, starting_letter, language) VALUES (?, ?, ?, ?, ?)"
    );

    for (const [word, length, letter, lang] of initialWords) {
      stmt.run([generateId(), word, length, letter, lang]);
    }
    stmt.free();

    console.log('📚 20 başlangyç söz goşuldy (10 TM + 10 EN)');

    await saveDb();
  }

  const savedVersion = localStorage.getItem('dbVersion');
  dbVersion = savedVersion ? parseInt(savedVersion, 10) : 0;

  return db;
};

const saveDb = async () => {
  if (db) {
    const data = db.export();
    await localforage.setItem('lingoDb', data);
    incrementVersion();
    sendUpdate(); // ← Sadece bunu çağır
  }
};

export const query = async (sql: string, params: any[] = []) => {
  const database = await getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

export const run = async (sql: string, params: any[] = []) => {
  const database = await getDb();
  database.run(sql, params);
  await saveDb();
};

export const single = async (sql: string, params: any[] = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const insert = async (table: string, data: Record<string, any>) => {
  const id = data.id || generateId();
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = Object.values(data);

  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  await run(sql, values);
  return id;
};

export const update = async (
  table: string,
  data: Record<string, any>,
  where: string,
  whereParams: any[] = []
) => {
  const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(data), ...whereParams];
  const sql = `UPDATE ${table} SET ${sets} WHERE ${where}`;
  await run(sql, values);
};

export const getWordsByLength = async (
  length: number,
  startingLetter?: string,
  language?: 'tm' | 'en' | 'ru' | 'all'
) => {
  let sql = 'SELECT * FROM words WHERE length = ?';
  const params: any[] = [length];

  if (startingLetter) {
    sql += ' AND starting_letter = ?';
    params.push(startingLetter.toUpperCase());
  }

  if (language && language !== 'all') {
    sql += ' AND language = ?';
    params.push(language);
  }

  sql += ' ORDER BY word';

  return await query(sql, params);
};

export const addWord = async (word: string, language: 'tm' | 'en' | 'ru' = 'tm') => {
    const upper = word.toUpperCase().trim();
  if (!upper) return;

  await run(
    'INSERT OR IGNORE INTO words (id, word, length, starting_letter, language) VALUES (?, ?, ?, ?, ?)',
    [generateId(), upper, upper.length, upper[0], language]
  );
};