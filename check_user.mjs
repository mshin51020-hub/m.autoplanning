import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

// .envから環境変数を読み込む
const envPath = '/home/ubuntu/muscle-plan/.env';
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  });
} catch(e) { console.log('.env読み込みエラー:', e.message); }

console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'undefined');

const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  'SELECT id, email, name, role, passwordHash, loginMethod, createdAt FROM users WHERE email = ?',
  ['mshin5.1020@gmail.com']
);
console.log('該当ユーザー:', JSON.stringify(rows, null, 2));

const [allRows] = await conn.execute(
  'SELECT id, email, name, role, loginMethod, createdAt FROM users LIMIT 10'
);
console.log('全ユーザー（最大10件）:', JSON.stringify(allRows, null, 2));

await conn.end();
