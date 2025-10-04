import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DB_CONNECT });

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // const queryText = 'INSERT INTO users(name) VALUES($1) RETURNING id';
    // const res = await client.query(queryText, ['brianc']);
    // const insertPhotoText = 'INSERT INTO photos(user_id, photo_url) VALUES ($1, $2)';
    // const insertPhotoValues = [res.rows[0].id, 's3.bucket.foo'];
    const queryText = "SELECT id, name FROM breweries LIMIT $1";
    const queryValues = [10];
    const result = await client.query(queryText, queryValues);
    await client.query("COMMIT");
    console.log(result);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

main().catch((e) => {
  console.error(e.stack);
  process.exit(1);
});
