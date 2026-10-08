import { writeFileSync } from "fs";
import { globSync } from "glob";
import {
  guildIdentity,
  guildPaths,
  loadGuildCsv,
  renderGuildCsv,
} from "./dataset.ts";

for (const file of globSync(guildPaths.sourceGlob).sort()) {
  const guilds = loadGuildCsv(file, true)
    .sort((a, b) => guildIdentity(a).localeCompare(guildIdentity(b)));
  writeFileSync(file, renderGuildCsv(guilds));
  console.log(`Generated ${guilds.length} guild IDs in ${file}`);
}
