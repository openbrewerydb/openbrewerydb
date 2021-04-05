// Convert CSV to SQL INSERTs
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import type { Brewery, BreweryKey } from "./utils/types";
import { headers, column_set } from "./config";
import Papa from "papaparse";
import pgpromise from "pg-promise";

const pgp = pgpromise({
  capSQL: true,
});
const csvPath = join(__dirname, "../breweries.csv");
const sqlPath = join(__dirname, "../breweries.sql");

try {
  const data = readFileSync(csvPath, { encoding: "utf-8" });
  const result = Papa.parse<Brewery>(data, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  const breweries = result.data;
  console.log(`📖 Read ${breweries.length} rows from ${csvPath}...`);

  console.log(breweries);

  let sql = pgp.helpers.insert(breweries, headers, "breweries");

  // Build ON CONFLICT update without `obdb_id` column
  const excluded = headers.slice(1).map((col) => `${col}=EXCLUDED.${col}`);

  sql += `ON CONFLICT(obdb_id) DO UPDATE SET ${excluded.join(", ")}`;
  writeFileSync(sqlPath, sql);

  console.log(`✅ Wrote ${sql.length} bytes to ${sqlPath}...`);
} catch (error) {
  console.error(error);
}
