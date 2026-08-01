import { writeFileSync, readFileSync } from "fs";
import { format } from "date-fns";
import { join } from "path";
import Papa from "papaparse";
import pgpromise from "pg-promise";
import Mustache from "mustache";
import { papaParseOptions, headers } from "./config.ts";
import { Brewery } from "./types.ts";

const pgp = pgpromise({
  capSQL: true,
});
const tableCreateTemplatePath = join(
  import.meta.dirname,
  "./templates/breweries-table-create.sql"
);
const csvPath = join(import.meta.dirname, "../breweries.csv");
const sqlPath = join(import.meta.dirname, "../breweries.sql");

const dateString = format(new Date(), "yyyyMMdd");
const cs = new pgp.helpers.ColumnSet(headers, {
  table: {
    table: `breweries_${dateString}`,
    schema: "breweries",
  },
});
const tableCreateSql = readFileSync(tableCreateTemplatePath, {
  encoding: "utf-8",
});
const tableCreateSqlTemplate = Mustache.render(tableCreateSql, {
  date: dateString,
});

try {
  const data = readFileSync(csvPath, { encoding: "utf-8" });
  const result = Papa.parse<Brewery>(data, papaParseOptions);
  const breweries = result.data;
  console.log(`📖 Read ${breweries.length} rows from ${csvPath}...`);

  let sql = pgp.helpers.insert(breweries, cs);

  writeFileSync(sqlPath, tableCreateSqlTemplate + sql);

  console.log(`✅ Wrote ${sql.length} bytes to ${sqlPath}...`);
} catch (error) {
  console.error(error);
}
