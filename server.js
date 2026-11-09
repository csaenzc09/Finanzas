require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const webpush = require('web-push');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'finanzas-super-secret-key-2026';

// Configuración VAPID para Web Push Notifications
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BNNZQG0fCeuKeo9BFZqILY4TqcNAmom1-cpcqy-Nt-jmfQP-r90WzKhKYilc3bytZDPIY0pXXqefkATOtgmsC7o';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'FPDp4xowra2dhuSMOugFXKcKSy3S8pPJS6v2kK1F3PA';

webpush.setVapidDetails(
  'mailto:contacto@finanzas.local',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Base de datos SQLite persistente en archivo
const dbPath = path.join(__dirname, 'finanzas.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    dueDate TEXT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    paidAmount REAL NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    endpoint TEXT UNIQUE NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migración: cédula para recuperación de contraseña
const userColumns = db.prepare('PRAGMA table_info(users)').all();
if (!userColumns.some(col => col.name === 'cedula')) {
  db.exec('ALTER TABLE users ADD COLUMN cedula TEXT');
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cedula ON users(cedula) WHERE cedula IS NOT NULL');

// Normaliza una cédula: solo dígitos, sin puntos ni espacios
function normalizeCedula(value) {
  return String(value || '').replace(/\D/g, '');
}

// Desactivar caché HTTP
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Rate limiter para proteger rutas de autenticación contra fuerza bruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // límite de 20 peticiones por IP en 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos desde esta conexión. Por favor intenta de nuevo en 15 minutos.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/recover', authLimiter);

// Servir frontend estático
app.use(express.static(__dirname, {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// Middleware de Autenticación
function authenticateToken(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión expirada o inválida' });
  }
}

// --- ENDPOINTS DE AUTENTICACIÓN ---

// Registro de usuario (Usuario, Cédula y Contraseña)
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, cedula } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    const cleanUser = username.trim().toLowerCase();
    if (cleanUser.length < 3) {
      return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres.' });
    }

    const cleanCedula = normalizeCedula(cedula);
    if (!cleanCedula) {
      return res.status(400).json({ error: 'La cédula es requerida para recuperar tu contraseña.' });
    }
    if (cleanCedula.length < 6 || cleanCedula.length > 12) {
      return res.status(400).json({ error: 'La cédula debe tener entre 6 y 12 dígitos.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUser);
    if (existing) {
      return res.status(400).json({ error: 'Este nombre de usuario ya está en uso.' });
    }

    const existingCedula = db.prepare('SELECT id FROM users WHERE cedula = ?').get(cleanCedula);
    if (existingCedula) {
      return res.status(400).json({ error: 'Esta cédula ya está registrada en otra cuenta.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = Date.now().toString();

    db.prepare(`
      INSERT INTO users (id, username, password, cedula)
      VALUES (?, ?, ?, ?)
    `).run(userId, cleanUser, hashedPassword, cleanCedula);

    // Crear token JWT y cookie HTTPOnly
    const token = jwt.sign({ id: userId, username: cleanUser }, JWT_SECRET, { expiresIn: '30d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      user: { id: userId, username: cleanUser, cedula: cleanCedula }
    });
  } catch (error) {
    console.error('Error register:', error);
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

// Inicio de sesión (Solo Usuario y Contraseña)
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUser);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: { id: user.id, username: user.username, cedula: user.cedula || null }
    });
  } catch (error) {
    console.error('Error login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

// Recuperación de contraseña: se restablece únicamente con la cédula
app.post('/api/auth/recover', (req, res) => {
  try {
    const { cedula, newPassword } = req.body;
    const cleanCedula = normalizeCedula(cedula);

    if (!cleanCedula) {
      return res.status(400).json({ error: 'Ingresa tu cédula.' });
    }
    if (!newPassword || newPassword.length < 3) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 3 caracteres.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE cedula = ?').get(cleanCedula);
    if (!user) {
      return res.status(404).json({ error: 'No existe una cuenta asociada a esta cédula.' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);

    res.json({
      success: true,
      username: user.username,
      message: 'Contraseña restablecida. Ya puedes iniciar sesión.'
    });
  } catch (error) {
    console.error('Error recover:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña.' });
  }
});

// Verificar estado de sesión actual
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, cedula FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.json({ authenticated: false });
    }
    res.json({ authenticated: true, user: { id: user.id, username: user.username, cedula: user.cedula || null } });
  } catch (err) {
    res.json({ authenticated: false });
  }
});

// Cerrar sesión
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

// --- ENDPOINTS DE CONFIGURACIÓN DE USUARIO ---

// Cambiar nombre de usuario
app.put('/api/user/username', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { newUsername } = req.body;

    if (!newUsername || newUsername.trim().length < 3) {
      return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres.' });
    }

    const cleanUsername = newUsername.trim().toLowerCase();

    // Validar si ya está en uso por otro usuario
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(cleanUsername, userId);
    if (existing) {
      return res.status(400).json({ error: 'Este nombre de usuario ya está en uso.' });
    }

    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(cleanUsername, userId);

    // Actualizar cookie JWT con el nuevo username
    const token = jwt.sign({ id: userId, username: cleanUsername }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, username: cleanUsername, message: 'Nombre de usuario actualizado con éxito' });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Error al cambiar nombre de usuario' });
  }
});

// Cambiar contraseña
app.put('/api/user/password', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Ingresa la contraseña actual y la nueva contraseña.' });
    }

    if (newPassword.length < 3) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 3 caracteres.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }

    const hashedNew = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedNew, userId);

    res.json({ success: true, message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// Actualizar cédula (para cuentas creadas antes de la recuperación)
app.put('/api/user/cedula', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const cleanCedula = normalizeCedula(req.body.cedula);

    if (!cleanCedula) {
      return res.status(400).json({ error: 'Ingresa tu cédula.' });
    }
    if (cleanCedula.length < 6 || cleanCedula.length > 12) {
      return res.status(400).json({ error: 'La cédula debe tener entre 6 y 12 dígitos.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE cedula = ? AND id != ?').get(cleanCedula, userId);
    if (existing) {
      return res.status(400).json({ error: 'Esta cédula ya está registrada en otra cuenta.' });
    }

    db.prepare('UPDATE users SET cedula = ? WHERE id = ?').run(cleanCedula, userId);

    res.json({ success: true, cedula: cleanCedula, message: 'Cédula guardada. Ya puedes recuperar tu contraseña con ella.' });
  } catch (error) {
    console.error('Error updating cedula:', error);
    res.status(500).json({ error: 'Error al guardar la cédula' });
  }
});

// --- ENDPOINTS DEUDAS (PROTEGIDOS POR USUARIO) ---

// 1. Obtener deudas del usuario autenticado
app.get('/api/debts', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const debts = db.prepare('SELECT * FROM debts WHERE userId = ? ORDER BY createdAt DESC').all(userId);
    const metaRow = db.prepare('SELECT value FROM metadata WHERE key = ?').get(`last_month_${userId}`);
    res.json({
      debts,
      lastMonth: metaRow ? metaRow.value : null
    });
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// 2. Crear una nueva deuda para el usuario
app.post('/api/debts', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { id, description, amount, dueDate, type, category, status, paidAmount } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'La descripción es obligatoria.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'El monto debe ser un número válido mayor o igual a cero.' });
    }

    const numPaid = parseFloat(paidAmount) || 0;
    if (numPaid < 0) {
      return res.status(400).json({ error: 'El monto pagado no puede ser negativo.' });
    }

    const stmt = db.prepare(`
      INSERT INTO debts (id, userId, description, amount, dueDate, type, category, status, paidAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const debtId = id || Date.now().toString();
    stmt.run(
      debtId,
      userId,
      description.trim(),
      numAmount,
      dueDate || '',
      type || 'unica',
      category || 'Otros',
      status || 'pendiente',
      numPaid
    );

    const created = db.prepare('SELECT * FROM debts WHERE id = ? AND userId = ?').get(debtId, userId);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating debt:', error);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
});

// 3. Actualizar una deuda
app.put('/api/debts/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { description, amount, dueDate, type, category, status, paidAmount } = req.body;

    const stmt = db.prepare(`
      UPDATE debts 
      SET description = ?, amount = ?, dueDate = ?, type = ?, category = ?, status = ?, paidAmount = ?
      WHERE id = ? AND userId = ?
    `);

    const result = stmt.run(
      description,
      parseFloat(amount),
      dueDate || '',
      type,
      category,
      status,
      parseFloat(paidAmount) || 0,
      id,
      userId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Deuda no encontrada' });
    }

    const updated = db.prepare('SELECT * FROM debts WHERE id = ? AND userId = ?').get(id, userId);
    res.json(updated);
  } catch (error) {
    console.error('Error updating debt:', error);
    res.status(500).json({ error: 'Error al actualizar en la base de datos' });
  }
});

// 4. Actualizar abono / pago parcial
app.post('/api/debts/:id/pay', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount } = req.body;
    const abono = parseFloat(amount);

    if (isNaN(abono) || abono <= 0) {
      return res.status(400).json({ error: 'Monto de abono inválido' });
    }

    const debt = db.prepare('SELECT * FROM debts WHERE id = ? AND userId = ?').get(id, userId);
    if (!debt) {
      return res.status(404).json({ error: 'Deuda no encontrada' });
    }

    const newPaid = debt.paidAmount + abono;
    const newStatus = newPaid >= debt.amount ? 'pagada' : 'pendiente';

    db.prepare('UPDATE debts SET paidAmount = ?, status = ? WHERE id = ? AND userId = ?').run(newPaid, newStatus, id, userId);

    const updated = db.prepare('SELECT * FROM debts WHERE id = ? AND userId = ?').get(id, userId);
    res.json(updated);
  } catch (error) {
    console.error('Error paying debt:', error);
    res.status(500).json({ error: 'Error al registrar abono' });
  }
});

// 5. Alternar estado (pagada / pendiente)
app.post('/api/debts/:id/toggle', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const debt = db.prepare('SELECT * FROM debts WHERE id = ? AND userId = ?').get(id, userId);
    if (!debt) {
      return res.status(404).json({ error: 'Deuda no encontrada' });
    }

    let newStatus = '';
    let newPaidAmount = 0;

    if (debt.status === 'pendiente') {
      newStatus = 'pagada';
      newPaidAmount = debt.amount;
    } else {
      newStatus = 'pendiente';
      newPaidAmount = 0;
    }

    db.prepare('UPDATE debts SET status = ?, paidAmount = ? WHERE id = ? AND userId = ?').run(newStatus, newPaidAmount, id, userId);

    const updated = db.prepare('SELECT * FROM debts WHERE id = ? AND userId = ?').get(id, userId);
    res.json(updated);
  } catch (error) {
    console.error('Error toggling debt status:', error);
    res.status(500).json({ error: 'Error al alternar estado' });
  }
});

// 6. Eliminar una deuda
app.delete('/api/debts/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = db.prepare('DELETE FROM debts WHERE id = ? AND userId = ?').run(id, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Deuda no encontrada' });
    }
    res.json({ success: true, message: 'Deuda eliminada' });
  } catch (error) {
    console.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Error al eliminar la deuda' });
  }
});

// 7. Migración / Sincronización
app.post('/api/debts/migrate', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { debts: legacyDebts } = req.body;
    if (Array.isArray(legacyDebts) && legacyDebts.length > 0) {
      const insert = db.prepare(`
        INSERT OR IGNORE INTO debts (id, userId, description, amount, dueDate, type, category, status, paidAmount)
        VALUES (@id, @userId, @description, @amount, @dueDate, @type, @category, @status, @paidAmount)
      `);

      const insertMany = db.transaction((items) => {
        for (const item of items) {
          insert.run({
            id: item.id || Date.now().toString(),
            userId,
            description: item.description || '',
            amount: parseFloat(item.amount) || 0,
            dueDate: item.dueDate || '',
            type: item.type || 'unica',
            category: item.category || 'Otros',
            status: item.status || 'pendiente',
            paidAmount: parseFloat(item.paidAmount) || 0
          });
        }
      });

      insertMany(legacyDebts);
    }
    res.json({ success: true, message: 'Migración completada' });
  } catch (error) {
    console.error('Error migrating debts:', error);
    res.status(500).json({ error: 'Error al migrar datos' });
  }
});

// 8. Actualizar mes de reseteo
app.post('/api/metadata/month', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.body;
    db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(`last_month_${userId}`, month);
    res.json({ success: true, month });
  } catch (error) {
    console.error('Error updating month:', error);
    res.status(500).json({ error: 'Error al actualizar mes' });
  }
});

// --- WEB PUSH NOTIFICATIONS ---

app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/push/subscribe', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO push_subscriptions (userId, endpoint, keys_p256dh, keys_auth)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth);
    res.json({ success: true, message: 'Dispositivo registrado para notificaciones' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Error al registrar suscripción' });
  }
});

app.post('/api/push/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const subs = db.prepare('SELECT * FROM push_subscriptions WHERE userId = ?').all(userId);
    if (subs.length === 0) {
      return res.json({ success: false, message: 'No hay dispositivos suscritos para tu usuario.' });
    }

    const payload = JSON.stringify({
      title: req.body.title || '🔔 Recordatorio Finanzas',
      body: req.body.body || '¡Notificaciones funcionando en tu móvil!',
      url: '/'
    });

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        };
        try {
          await webpush.sendNotification(pushSubscription, payload);
          return { endpoint: sub.endpoint, status: 'ok' };
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
          }
          throw err;
        }
      })
    );

    const sentCount = results.filter(r => r.status === 'fulfilled').length;
    res.json({ success: true, sent: sentCount, total: subs.length });
  } catch (error) {
    console.error('Error sending push:', error);
    res.status(500).json({ error: 'Error al enviar notificación' });
  }
});

app.post('/api/push/check-and-notify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const debts = db.prepare("SELECT * FROM debts WHERE status = 'pendiente' AND userId = ?").all(userId);
    const subs = db.prepare('SELECT * FROM push_subscriptions WHERE userId = ?').all(userId);

    if (subs.length === 0) {
      return res.json({ message: 'No tienes dispositivos registrados para recibir notificaciones.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let urgentDebts = [];
    let overdueDebts = [];

    debts.forEach(d => {
      if (!d.dueDate) return;
      const [y, m, day] = d.dueDate.split('-');
      const due = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        overdueDebts.push(d);
      } else if (diffDays <= 3) {
        urgentDebts.push(d);
      }
    });

    if (urgentDebts.length === 0 && overdueDebts.length === 0) {
      return res.json({ message: 'No hay deudas urgentes o vencidas para alertar hoy.' });
    }

    let alertTitle = '⚠️ Alerta de Deudas Pendientes';
    let alertBody = '';

    if (overdueDebts.length > 0 && urgentDebts.length > 0) {
      alertBody = `Tienes ${overdueDebts.length} deuda(s) vencida(s) y ${urgentDebts.length} por vencer pronto.`;
    } else if (overdueDebts.length > 0) {
      alertBody = `Tienes ${overdueDebts.length} deuda(s) vencida(s): ${overdueDebts[0].description} y más.`;
    } else {
      alertBody = `Tienes ${urgentDebts.length} deuda(s) próxima(s) a vencer: ${urgentDebts[0].description}.`;
    }

    const payload = JSON.stringify({
      title: alertTitle,
      body: alertBody,
      url: '/'
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        };
        try {
          return await webpush.sendNotification(pushSubscription, payload);
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
          }
        }
      })
    );

    res.json({ success: true, message: 'Alertas enviadas a tus dispositivos', urgent: urgentDebts.length, overdue: overdueDebts.length });
  } catch (error) {
    console.error('Error check and notify:', error);
    res.status(500).json({ error: 'Error al procesar alertas push' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de Finanzas con Autenticación y SQLite en http://localhost:${PORT}`);
});
