import { writeFileSync } from "fs";
import { guildPaths, loadGuildCsv, renderGuildJson, validateUniqueGuilds } from "./dataset.ts";

const guilds = loadGuildCsv(guildPaths.csv);
validateUniqueGuilds(guilds);
writeFileSync(guildPaths.json, renderGuildJson(guilds));
console.log(`Wrote ${guilds.length} guilds to ${guildPaths.json}`);
