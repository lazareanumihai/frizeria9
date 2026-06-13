/**
 * Multi-tenant seed / migration helper. Idempotent and safe to run against an
 * existing single-tenant database:
 *   1. Ensures a default tenant exists ("Frizeria 9", slug "frizeria9").
 *   2. Backfills tenantId on all existing rows that don't have one yet.
 *   3. Ensures the global Master Admin (super_admin, no tenantId) exists with the
 *      configured credentials.
 *   4. Recomputes every tenant's monthly subscription total.
 *
 * Usage: DATABASE_URL=... node seed-multitenant.mjs
 */
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const MASTER_EMAIL = process.env.MASTER_ADMIN_EMAIL || 'lazareanu_mihai@yahoo.com';
const MASTER_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || 'Qgz10nkl9634wQ';
const DEFAULT_TENANT_NAME = process.env.DEFAULT_TENANT_NAME || 'Frizeria 9';
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'frizeria9';

const url = new URL(DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
  multipleStatements: true,
});

try {
  // 1. Ensure default tenant exists.
  let [rows] = await connection.execute('SELECT id FROM tenants WHERE slug = ?', [DEFAULT_TENANT_SLUG]);
  let tenantId;
  if (rows.length > 0) {
    tenantId = rows[0].id;
    console.log(`✓ Default tenant already exists (id=${tenantId})`);
  } else {
    const [res] = await connection.execute(
      'INSERT INTO tenants (name, slug, adminEmail, basePricePerBarber, currentMonthlyTotal) VALUES (?, ?, ?, ?, ?)',
      [DEFAULT_TENANT_NAME, DEFAULT_TENANT_SLUG, MASTER_EMAIL, '50', '0']
    );
    tenantId = res.insertId;
    console.log(`✓ Created default tenant "${DEFAULT_TENANT_NAME}" (id=${tenantId})`);
  }

  // 2. Backfill tenantId on all existing data rows.
  for (const table of ['barbers', 'services', 'bookings', 'settings', 'barberAvailability', 'blockedHours']) {
    const [res] = await connection.execute(`UPDATE \`${table}\` SET tenantId = ? WHERE tenantId IS NULL`, [tenantId]);
    if (res.affectedRows > 0) console.log(`✓ Backfilled ${res.affectedRows} rows in ${table}`);
  }

  // 3. Ensure Master Admin (super_admin, no tenant).
  const passwordHash = await bcrypt.hash(MASTER_PASSWORD, 10);
  [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [MASTER_EMAIL]);
  if (rows.length > 0) {
    await connection.execute(
      'UPDATE users SET passwordHash = ?, loginMethod = ?, role = ?, tenantId = NULL WHERE email = ?',
      [passwordHash, 'email', 'super_admin', MASTER_EMAIL]
    );
    console.log(`✓ Master Admin updated (${MASTER_EMAIL}, role=super_admin)`);
  } else {
    const openId = `email_${MASTER_EMAIL}_${Date.now()}`;
    await connection.execute(
      'INSERT INTO users (openId, email, name, passwordHash, loginMethod, role, tenantId) VALUES (?, ?, ?, ?, ?, ?, NULL)',
      [openId, MASTER_EMAIL, 'Master Admin', passwordHash, 'email', 'super_admin']
    );
    console.log(`✓ Master Admin created (${MASTER_EMAIL}, role=super_admin)`);
  }

  // 4. Recompute monthly totals for every tenant.
  const [tenants] = await connection.execute('SELECT id, basePricePerBarber FROM tenants');
  for (const t of tenants) {
    const [[{ activeBarbers }]] = await connection.execute(
      'SELECT COUNT(*) AS activeBarbers FROM barbers WHERE tenantId = ? AND isActive = 1',
      [t.id]
    );
    const total = (Number(activeBarbers) * parseFloat(t.basePricePerBarber)).toFixed(2);
    await connection.execute('UPDATE tenants SET currentMonthlyTotal = ? WHERE id = ?', [total, t.id]);
    console.log(`✓ Tenant ${t.id}: ${activeBarbers} active barbers -> ${total} RON/month`);
  }

  console.log('Seed complete.');
} catch (error) {
  console.error('Error:', error);
  process.exitCode = 1;
} finally {
  await connection.end();
}
