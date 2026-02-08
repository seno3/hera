import snowflake from 'snowflake-sdk';
import dotenv from 'dotenv';

dotenv.config();

snowflake.configure({ logLevel: 'ERROR' });

const pool = snowflake.createPool({
  account: process.env.SNOWFLAKE_ACCOUNT!,
  username: process.env.SNOWFLAKE_USER!,
  password: process.env.SNOWFLAKE_PASSWORD!,
  database: process.env.SNOWFLAKE_DATABASE || 'hera_db',
  schema: process.env.SNOWFLAKE_SCHEMA || 'public',
  warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'hera_wh',
}, { max: 5, min: 0 });

export async function query<T = any>(sql: string, binds: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    pool.use(async (conn) => {
      return new Promise<T[]>((res, rej) => {
        conn.execute({
          sqlText: sql,
          binds,
          complete: (err, stmt, rows) => {
            if (err) rej(err);
            else res((rows || []) as T[]);
          }
        });
      });
    }).then(resolve).catch(reject);
  });
}

export function parseVariant(val: any): any {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}
