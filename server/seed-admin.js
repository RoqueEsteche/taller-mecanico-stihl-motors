import 'dotenv/config';
import { hashPassword } from './auth.js';
import { pool, query } from './db.js';

const isProduction = process.env.NODE_ENV === 'production';
const adminEmail = process.env.ADMIN_EMAIL || (isProduction ? '' : 'admin@stihlmotors.local');
const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : '1234');
const adminName = process.env.ADMIN_NAME || 'Administrador General';

const receiverEmail = process.env.RECEIVER_EMAIL || (isProduction ? '' : 'recepcion@stihlmotors.local');
const receiverPassword = process.env.RECEIVER_PASSWORD || (isProduction ? '' : '1234');
const receiverName = process.env.RECEIVER_NAME || 'Recepción';

const mechanicEmail = process.env.MECHANIC_EMAIL || (isProduction ? '' : 'mecanico@stihlmotors.local');
const mechanicPassword = process.env.MECHANIC_PASSWORD || (isProduction ? '' : '1234');
const mechanicName = process.env.MECHANIC_NAME || 'Mecánico de Taller';

const stockManagerEmail = process.env.STOCK_MANAGER_EMAIL || (isProduction ? '' : 'stock@stihlmotors.local');
const stockManagerPassword = process.env.STOCK_MANAGER_PASSWORD || (isProduction ? '' : '1234');
const stockManagerName = process.env.STOCK_MANAGER_NAME || 'Encargado de Stock';

if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios en producción.');
}

async function seedAdmin() {
  const users = [
    { email: adminEmail.toLowerCase(), name: adminName, role: 'admin', password: adminPassword },
    { email: receiverEmail.toLowerCase(), name: receiverName, role: 'receiver', password: receiverPassword },
    { email: mechanicEmail.toLowerCase(), name: mechanicName, role: 'mechanic', password: mechanicPassword },
    { email: stockManagerEmail.toLowerCase(), name: stockManagerName, role: 'stock_manager', password: stockManagerPassword },
  ];

  for (const user of users) {
    if (isProduction && !user.email) {
      throw new Error(`La variable de entorno para ${user.role.toUpperCase()} es obligatoria en producción.`);
    }

    const passwordHash = await hashPassword(user.password);

    await query(
      `insert into app_user (email, display_name, role, password_hash, active)
       values ($1, $2, $3, $4, true)
       on conflict (email)
       do update set
         display_name = excluded.display_name,
         role = excluded.role,
         password_hash = excluded.password_hash,
         active = true,
         updated_at = now()`,
      [user.email, user.name, user.role, passwordHash],
    );

    console.log(`Usuario listo: ${user.email} (${user.role})`);
  }
}

seedAdmin()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });