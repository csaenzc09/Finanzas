/**
 * Script de respaldo automático para SQLite
 * Ejecutar con: npm run backup
 */
require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'finanzas.db');
const backupsDir = path.join(__dirname, 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

if (!fs.existsSync(dbPath)) {
  console.error('No se encontró la base de datos finanzas.db');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupsDir, `finanzas-backup-${timestamp}.db`);

console.log(`Iniciando copia de seguridad en: ${backupFile}...`);

try {
  const db = new Database(dbPath);
  db.backup(backupFile)
    .then(() => {
      console.log('✅ Copia de seguridad completada con éxito.');

      // Mantener solo los últimos 7 respaldos
      const files = fs.readdirSync(backupsDir)
        .filter(f => f.startsWith('finanzas-backup-') && f.endsWith('.db'))
        .sort()
        .reverse();

      if (files.length > 7) {
        const toDelete = files.slice(7);
        for (const f of toDelete) {
          fs.unlinkSync(path.join(backupsDir, f));
          console.log(`Limpieza: se eliminó respaldo antiguo ${f}`);
        }
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error durante el respaldo:', err);
      process.exit(1);
    });
} catch (err) {
  console.error('❌ Error al abrir la base de datos:', err);
  process.exit(1);
}

