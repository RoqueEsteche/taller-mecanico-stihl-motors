import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { pool, withTransaction } from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvDir = path.resolve(__dirname, '..', 'plantillas_importacion');

function readCsvAsRows(fileName) {
  const filePath = path.join(csvDir, fileName);
  const workbook = xlsx.readFile(filePath, { raw: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(firstSheet, { defval: '' });
}

function clean(value) {
  return String(value ?? '').trim();
}

function num(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function intNum(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const suppliers = readCsvAsRows('02_proveedores.csv');
  const parts = readCsvAsRows('03_repuestos.csv');
  const clients = readCsvAsRows('01_clientes.csv');
  const workOrders = readCsvAsRows('04_ordenes_trabajo.csv');

  const stats = {
    suppliersInserted: 0,
    suppliersUpdated: 0,
    partsInserted: 0,
    partsUpdated: 0,
    clientsInserted: 0,
    clientsUpdated: 0,
    workOrdersInserted: 0,
    machinesInserted: 0,
  };

  console.log('Iniciando importacion CSV a DB...');
  console.log(`Filas leidas -> proveedores: ${suppliers.length}, repuestos: ${parts.length}, clientes: ${clients.length}, ordenes: ${workOrders.length}`);

  await withTransaction(async (client) => {
    const supplierKeyToId = new Map();

    console.log('Procesando proveedores...');

    for (const row of suppliers) {
      const supplierKey = clean(row.supplier_key);
      const name = clean(row.name);
      if (!supplierKey || !name) continue;

      const existing = await client.query('select id from supplier where lower(name) = lower($1) limit 1', [name]);

      if (existing.rowCount > 0) {
        const supplierId = existing.rows[0].id;
        await client.query(
          `update supplier
           set contact = $2, phone = $3, email = $4, notes = $5, updated_at = now()
           where id = $1`,
          [
            supplierId,
            clean(row.contact),
            clean(row.phone),
            clean(row.email),
            clean(row.notes),
          ],
        );
        supplierKeyToId.set(supplierKey, supplierId);
        stats.suppliersUpdated += 1;
      } else {
        const created = await client.query(
          `insert into supplier (name, contact, phone, email, notes)
           values ($1, $2, $3, $4, $5)
           returning id`,
          [
            name,
            clean(row.contact),
            clean(row.phone),
            clean(row.email),
            clean(row.notes),
          ],
        );
        const supplierId = created.rows[0].id;
        supplierKeyToId.set(supplierKey, supplierId);
        stats.suppliersInserted += 1;
      }
    }

    console.log('Procesando repuestos...');

    for (const row of parts) {
      const code = clean(row.code);
      const description = clean(row.description);
      if (!code || !description) continue;

      const supplierIdFromCsv = clean(row.supplier_id);
      const supplierKey = clean(row.supplier_key);
      const supplierId = supplierIdFromCsv || supplierKeyToId.get(supplierKey) || null;

      const existing = await client.query('select id from part where code = $1 limit 1', [code]);

      if (existing.rowCount > 0) {
        await client.query(
          `update part
           set description = $2,
               machine_category = $3,
               machine_brand = $4,
               machine_model = $5,
               price = $6,
               stock = $7,
               min_stock = $8,
               supplier_id = $9,
               updated_at = now()
           where code = $1`,
          [
            code,
            description,
            clean(row.machine_category) || 'General',
            clean(row.machine_brand),
            clean(row.machine_model),
            num(row.price, 0),
            intNum(row.stock, 0),
            intNum(row.min_stock, 0),
            supplierId,
          ],
        );
        stats.partsUpdated += 1;
      } else {
        await client.query(
          `insert into part (code, description, machine_category, machine_brand, machine_model, price, stock, min_stock, supplier_id)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            code,
            description,
            clean(row.machine_category) || 'General',
            clean(row.machine_brand),
            clean(row.machine_model),
            num(row.price, 0),
            intNum(row.stock, 0),
            intNum(row.min_stock, 0),
            supplierId,
          ],
        );
        stats.partsInserted += 1;
      }
    }

    console.log('Procesando clientes...');

    for (const row of clients) {
      const ci = clean(row.ci);
      const name = clean(row.name);
      if (!ci || !name) continue;

      const existing = await client.query('select id from client where ci = $1 limit 1', [ci]);
      if (existing.rowCount > 0) {
        await client.query(
          `update client
           set name = $2, phone = $3, address = $4, updated_at = now()
           where ci = $1`,
          [ci, name, clean(row.phone), clean(row.address)],
        );
        stats.clientsUpdated += 1;
      } else {
        await client.query(
          `insert into client (ci, name, phone, address)
           values ($1, $2, $3, $4)`,
          [ci, name, clean(row.phone), clean(row.address)],
        );
        stats.clientsInserted += 1;
      }
    }

    console.log('Procesando ordenes de trabajo...');
    let workOrderIndex = 0;

    for (const row of workOrders) {
      workOrderIndex += 1;
      if (workOrderIndex % 25 === 0) {
        console.log(`Ordenes procesadas: ${workOrderIndex}/${workOrders.length}`);
      }

      const clientCI = clean(row.client_ci);
      const clientName = clean(row.client_name);
      const machineName = clean(row.machine_name);
      if (!clientCI || !clientName || !machineName) continue;

      const clientRes = await client.query('select id from client where ci = $1 limit 1', [clientCI]);
      let clientId;

      if (clientRes.rowCount > 0) {
        clientId = clientRes.rows[0].id;
      } else {
        const createdClient = await client.query(
          `insert into client (ci, name, phone, address)
           values ($1, $2, $3, $4)
           returning id`,
          [clientCI, clientName, clean(row.phone), clean(row.address)],
        );
        clientId = createdClient.rows[0].id;
        stats.clientsInserted += 1;
      }

      const brand = clean(row.brand);
      const machineModel = clean(row.machine_model);
      const serialNumber = clean(row.serial_number);

      const machineRes = await client.query(
        `select id from machine
         where client_id = $1
           and lower(name) = lower($2)
           and lower(brand) = lower($3)
           and lower(model) = lower($4)
           and lower(serial_number) = lower($5)
         limit 1`,
        [clientId, machineName, brand, machineModel, serialNumber],
      );

      let machineId;
      if (machineRes.rowCount > 0) {
        machineId = machineRes.rows[0].id;
      } else {
        const createdMachine = await client.query(
          `insert into machine (client_id, name, brand, model, serial_number)
           values ($1, $2, $3, $4, $5)
           returning id`,
          [clientId, machineName, brand, machineModel, serialNumber],
        );
        machineId = createdMachine.rows[0].id;
        stats.machinesInserted += 1;
      }

      const counterResult = await client.query(
        `insert into counter (key, value) values ($1, 1)
         on conflict (key) do update set value = counter.value + 1
         returning value`,
        ['workOrders'],
      );
      const orderNumber = Number(counterResult.rows[0].value);

      await client.query(
        `insert into work_order (
           order_number, client_id, client_name, client_ci, machine_id, machine_name,
           machine_model, brand, serial_number, accessories, observations, description,
           findings, status, labor_cost, parts_cost, total, mechanic_id, mechanic_name,
           warranty_type, warranty_notes, related_order_id, audit_trail
         ) values (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10, $11, $12,
           '', 'pending', 0, 0, 0, $13, $14,
           $15, $16, $17, '[]'::jsonb
         )`,
        [
          orderNumber,
          clientId,
          clientName,
          clientCI,
          machineId,
          machineName,
          machineModel,
          brand,
          serialNumber,
          clean(row.accessories),
          clean(row.observations),
          clean(row.description),
          clean(row.mechanic_id) || null,
          clean(row.mechanic_name) || null,
          clean(row.warranty_type) || null,
          clean(row.warranty_notes) || null,
          clean(row.related_order_id) || null,
        ],
      );

      stats.workOrdersInserted += 1;
    }
  });

  console.log('Importacion completada');
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error('Error en importacion:', error.message);
    await pool.end();
    process.exit(1);
  });
