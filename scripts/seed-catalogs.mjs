import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pnUZkOE7eCA9@ep-odd-bread-and7wvaq.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

try {
  await pool.query(`
    create table if not exists machine_brand (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      created_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists machine_category (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      created_at timestamptz not null default now()
    )
  `);
  const brands = ['Stihl','Husqvarna','Honda','Briggs and Stratton','Kawasaki','Yamaha','Robin','Kohler'];
  for (const b of brands) {
    await pool.query('insert into machine_brand(name) values($1) on conflict do nothing', [b]);
  }
  const cats = ['Motosierra','Desbrozadora','Motoguadana','Motobomba','Generador','Cortadora de cesped','Sopladora','Pulverizadora','Bordeadora','Otro'];
  for (const c of cats) {
    await pool.query('insert into machine_category(name) values($1) on conflict do nothing', [c]);
  }
  console.log('Tablas y datos de catalogo creados OK');
} catch(e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
