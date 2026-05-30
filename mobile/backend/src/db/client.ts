import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, types } from 'pg';
import { config } from '../config';
import * as schema from './schema';

// Return TIMESTAMPTZ and TIMESTAMP columns as ISO strings instead of Date objects.
// 1184 = TIMESTAMPTZ, 1114 = TIMESTAMP WITHOUT TIME ZONE
types.setTypeParser(1184, (val: string) => new Date(val).toISOString());
types.setTypeParser(1114, (val: string) => new Date(val).toISOString());

export const pool = new Pool({ connectionString: config.DATABASE_URL });

export const db = drizzle(pool, { schema });
