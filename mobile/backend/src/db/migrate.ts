import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { config } from '../config';

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: config.DATABASE_URL });

  try {
    // Tracking table — idempotent
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const dir = join(__dirname, 'migrations');
    const files = readdirSync(dir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await pool.query(
        'SELECT 1 FROM _migrations WHERE filename = $1',
        [file],
      );
      if (rows.length > 0) {
        console.log(`skip: ${file}`);
        continue;
      }

      const sql = readFileSync(join(dir, file), 'utf8');
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`applied: ${file}`);
    }

    console.log('migrations complete');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('migration failed:', err);
  process.exit(1);
});
