import { writeFileSync } from "fs";
import { guildPaths, loadGuildCsv, renderGuildSql, validateUniqueGuilds } from "./dataset.ts";

const guilds = loadGuildCsv(guildPaths.csv);
validateUniqueGuilds(guilds);
writeFileSync(guildPaths.sql, renderGuildSql(guilds));
console.log(`Wrote ${guilds.length} guilds to ${guildPaths.sql}`);
