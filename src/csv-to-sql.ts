// Convert CSV to SQL INSERTs
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { Brewery } from "./utils/types";
import { headers } from "./config";
import Papa from "papaparse";
import pgpromise from "pg-promise";

const pgp = pgpromise({
  capSQL: true,
});
const csvPath = join(__dirname, "../breweries.csv");
const sqlPath = join(__dirname, "../breweries.sql");

const cs = new pgp.helpers.ColumnSet(headers, { table: "breweries" });

try {
  const data = readFileSync(csvPath, { encoding: "utf-8" });
  const result = Papa.parse<Brewery>(data, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  const breweries = result.data;
  console.log(`📖 Read ${breweries.length} rows from ${csvPath}...`);

  let sql =
    pgp.helpers.insert(breweries, cs) +
    " ON CONFLICT(obdb_id) DO UPDATE SET " +
    cs.assignColumns({ from: "EXCLUDED", skip: "obdb_id" });

  writeFileSync(sqlPath, sql);

  console.log(`✅ Wrote ${sql.length} bytes to ${sqlPath}...`);
} catch (error) {
  console.error(error);
}
