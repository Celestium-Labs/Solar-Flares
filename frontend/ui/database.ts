import { Pool } from 'pg';
import { env, off } from 'process';
import PoolModel from './models/pool';

// bulk insert
// https://github.com/brianc/node-postgres/issues/957#issuecomment-295583050

class Connector {

  private static _instance: Connector;

  pool: Pool;

  private constructor() {

    if (process.env.NEXT_PUBLIC_ENV != 'prod') {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
      })
    } else {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      })
    }

  }

  public static get instance(): Connector {

    if (!this._instance) {
      this._instance = new Connector();
    }

    return this._instance;
  }

}

const connector = Connector.instance;
const pool = connector.pool;

export async function fetchPool(poolId: string) {

  const client = await pool.connect();
  const result = await client.query("SELECT * FROM pool WHERE pool_id = $1", [poolId]);
  client.release();

  if (result.rowCount == 1) {
    return result.rows[0] as PoolModel;
  }

  return null;
}

export async function insertPool(poolId: string, name: string, index: number, url: string, activeUntil: Date, canisterId: string, price: string, supply: number) {

  const client = await pool.connect();

  await client.query('BEGIN');
  const id = await client.query("INSERT INTO pool (pool_id, name, index, url, active_until, canister_id, price, supply) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id", [poolId, name, index, url, activeUntil, canisterId, price, supply]);
  await client.query('COMMIT');
  client.release();

  return id.rows[0].id as number
}

export async function fetchPools() {

  const client = await pool.connect();

  await client.query('BEGIN');
  const result = await client.query("SELECT * FROM pool ORDER BY active_until DESC");
  await client.query('COMMIT');
  client.release();

  result.rows.forEach(row => {
    row.active_until = row.active_until.getTime();
  })

  return result.rows as PoolModel[];
}