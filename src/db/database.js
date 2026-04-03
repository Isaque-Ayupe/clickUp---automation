import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../data/automation.db');

let db;

/**
 * Inicializa o banco de dados SQLite e cria as tabelas se não existirem.
 */
export function initDatabase() {
  // Garante que o diretório data/ existe
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // WAL mode para melhor performance com writes concorrentes
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      issue_id       INTEGER PRIMARY KEY,
      issue_number   INTEGER NOT NULL,
      issue_title    TEXT NOT NULL,
      clickup_task_id TEXT,
      assigned_to    TEXT,
      area           TEXT,
      priority       TEXT,
      created_at     TEXT DEFAULT (datetime('now'))
    );
  `);

  logger.info('Banco de dados inicializado:', DB_PATH);
  return db;
}

/**
 * Verifica se uma issue já foi processada.
 */
export function isIssueProcessed(issueId) {
  const row = db.prepare('SELECT 1 FROM tasks WHERE issue_id = ?').get(issueId);
  return !!row;
}

/**
 * Salva o registro de uma task criada.
 */
export function saveTask({ issueId, issueNumber, issueTitle, clickupTaskId, assignedTo, area, priority }) {
  const stmt = db.prepare(`
    INSERT INTO tasks (issue_id, issue_number, issue_title, clickup_task_id, assigned_to, area, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(issueId, issueNumber, issueTitle, clickupTaskId, assignedTo, area, priority);
  logger.debug(`Task salva no banco: issue #${issueNumber} → ${clickupTaskId}`);
}

/**
 * Retorna a contagem de tasks por membro (para cálculo de workload).
 */
export function getWorkloadCounts() {
  const rows = db.prepare(`
    SELECT assigned_to, COUNT(*) as task_count
    FROM tasks
    GROUP BY assigned_to
  `).all();

  const workload = {};
  for (const row of rows) {
    workload[row.assigned_to] = row.task_count;
  }
  return workload;
}

/**
 * Retorna todas as tasks registradas.
 */
export function getAllTasks() {
  return db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
}

/**
 * Fecha a conexão com o banco.
 */
export function closeDatabase() {
  if (db) {
    db.close();
    logger.info('Conexão com o banco de dados encerrada.');
  }
}
