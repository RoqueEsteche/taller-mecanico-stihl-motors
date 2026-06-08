import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const defaultConnectionString = 'postgresql://postgres:postgres@localhost:5432/stihl_motors';
const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL || (isProduction ? '' : defaultConnectionString);

if (!connectionString) {
  throw new Error('DATABASE_URL es obligatorio en producción.');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTransaction(work) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
