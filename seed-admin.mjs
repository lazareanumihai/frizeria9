import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL.split('@')[1].split('/')[0],
  user: process.env.DATABASE_URL.split('://')[1].split(':')[0],
  password: process.env.DATABASE_URL.split(':')[2].split('@')[0],
  database: process.env.DATABASE_URL.split('/').pop(),
});

const email = 'lazareanu_mihai@yahoo.com';
const password = 'Mycomputer.1';
const passwordHash = await bcrypt.hash(password, 10);
const openId = `email_${email}_${Date.now()}`;

try {
  // Check if user exists
  const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
  
  if (rows.length > 0) {
    // Update existing user
    await connection.execute(
      'UPDATE users SET passwordHash = ?, loginMethod = ?, role = ? WHERE email = ?',
      [passwordHash, 'email', 'admin', email]
    );
    console.log('✓ Admin user updated');
  } else {
    // Create new user
    await connection.execute(
      'INSERT INTO users (openId, email, name, passwordHash, loginMethod, role) VALUES (?, ?, ?, ?, ?, ?)',
      [openId, email, 'Admin', passwordHash, 'email', 'admin']
    );
    console.log('✓ Admin user created');
  }
} catch (error) {
  console.error('Error:', error);
} finally {
  await connection.end();
}
