import { writeFileSync } from "fs";
import { guildPaths, loadGuildSources, renderGuildCsv } from "./dataset.ts";

const guilds = loadGuildSources();
writeFileSync(guildPaths.csv, renderGuildCsv(guilds));
console.log(`Wrote ${guilds.length} guilds to ${guildPaths.csv}`);
