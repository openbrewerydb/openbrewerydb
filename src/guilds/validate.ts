import { readFileSync } from "fs";
import {
  guildPaths,
  loadGuildCsv,
  loadGuildSources,
  renderGuildCsv,
  renderGuildJson,
  renderGuildSql,
  validateUniqueGuilds,
} from "./dataset.ts";

const sourceGuilds = loadGuildSources();
const masterGuilds = loadGuildCsv(guildPaths.csv);
validateUniqueGuilds(masterGuilds);

if (readFileSync(guildPaths.csv, "utf-8") !== renderGuildCsv(sourceGuilds)) {
  throw new Error("guilds.csv is not current; run npm run workflow:guilds");
}
if (readFileSync(guildPaths.json, "utf-8") !== renderGuildJson(masterGuilds)) {
  throw new Error("guilds.json is not current; run npm run workflow:guilds");
}

const sql = readFileSync(guildPaths.sql, "utf-8");
const sqlDate = sql.match(/guilds_(\d{8})/)?.[1];
if (!sqlDate || sql !== renderGuildSql(masterGuilds, sqlDate)) {
  throw new Error("guilds.sql is not current; run npm run workflow:guilds");
}

console.log(`All guild source and generated files are valid (${sourceGuilds.length} records)`);
