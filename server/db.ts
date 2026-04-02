import mysql, { Pool } from 'mysql2/promise';

// Pool is created lazily inside initDb() so that .env vars are loaded first
let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) throw new Error('Database not initialised — call initDb() first');
  return _pool;
}

// Proxy so existing `pool.query(...)` imports keep working
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
});

export async function initDb() {
  _pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'logtime',
    waitForConnections: true,
    connectionLimit: 10,
  });

  const conn = await _pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS log_entries (
        id           VARCHAR(36)                                    NOT NULL PRIMARY KEY,
        task_type    ENUM('jira','teamwork','takeoff')              NOT NULL,
        ticket_key   VARCHAR(50)                                    NOT NULL DEFAULT '',
        title        VARCHAR(500)                                   NOT NULL DEFAULT '',
        hours        INT                                            NOT NULL DEFAULT 0,
        minutes      INT                                            NOT NULL DEFAULT 0,
        time_spent   DECIMAL(8,4)                                   NOT NULL DEFAULT 0,
        date         DATE                                           NOT NULL,
        teamwork_type ENUM('meeting','code_review','support')       NULL,
        takeoff_period ENUM('full','morning','afternoon')           NULL,
        created_at   BIGINT                                         NOT NULL
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS jira_tasks (
        ticket_key VARCHAR(50)  NOT NULL PRIMARY KEY,
        title      VARCHAR(500) NOT NULL DEFAULT ''
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS teamwork_tasks (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        teamwork_type ENUM('meeting','code_review','support') NOT NULL,
        name          VARCHAR(500) NOT NULL,
        UNIQUE KEY uq_type_name (teamwork_type, name)
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id           VARCHAR(36)                                NOT NULL PRIMARY KEY,
        invoice_type ENUM('invoice','credit_note')             NOT NULL,
        domain       VARCHAR(255)                              NOT NULL DEFAULT '',
        total        DECIMAL(15,2)                             NOT NULL DEFAULT 0,
        datetime     DATE                                      NOT NULL,
        description  TEXT                                      NULL,
        status       ENUM('pending','paid','overtime')         NOT NULL DEFAULT 'pending',
        created_at   BIGINT                                    NOT NULL
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id  VARCHAR(36)   NOT NULL,
        description TEXT          NOT NULL,
        price       DECIMAL(15,2) NOT NULL DEFAULT 0,
        quantity    DECIMAL(10,4) NOT NULL DEFAULT 1,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables ready');
  } finally {
    conn.release();
  }
}
