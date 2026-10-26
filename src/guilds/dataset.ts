import { readFileSync } from "fs";
import { basename, dirname, join } from "path";
import { format } from "date-fns";
import { globSync } from "glob";
import Mustache from "mustache";
import Papa from "papaparse";
import pgpromise from "pg-promise";
import slugify from "slugify";
import { v5 as uuidv5 } from "uuid";
import { papaParseOptions, slugifyOptions } from "../config.ts";
import states from "../states.ts";
import { GUILD_HEADERS } from "./config.ts";
import { Guild } from "./types.ts";

export const guildPaths = {
  sourceGlob: join(import.meta.dirname, "../../datasets/*/guilds.csv"),
  csv: join(import.meta.dirname, "../../guilds.csv"),
  json: join(import.meta.dirname, "../../guilds.json"),
  sql: join(import.meta.dirname, "../../guilds.sql"),
  sqlTemplate: join(import.meta.dirname, "../templates/guilds-table-create.sql"),
};

const guildIdNamespace = uuidv5("guilds.openbrewerydb.org", uuidv5.DNS);
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const usSubdivisions: Record<string, { abbreviation: string }> = {
  ...states,
  "American Samoa": { abbreviation: "AS" },
  Guam: { abbreviation: "GU" },
  "Northern Mariana Islands": { abbreviation: "MP" },
  "Puerto Rico": { abbreviation: "PR" },
  "United States Minor Outlying Islands": { abbreviation: "UM" },
  "Virgin Islands": { abbreviation: "VI" },
};

export function guildIdentity(
  guild: Pick<Guild, "country_code" | "scope" | "subdivision_code" | "organization">
) {
  return JSON.stringify([
    guild.country_code.toLowerCase(),
    guild.scope,
    guild.subdivision_code?.toLowerCase() ?? null,
    guild.organization.trim().replace(/\s+/g, " ").toLowerCase(),
  ]);
}

export function generateGuildId(
  guild: Pick<Guild, "country_code" | "scope" | "subdivision_code" | "organization">
) {
  return uuidv5(guildIdentity(guild), guildIdNamespace);
}

function assertHeaders(file: string, fields?: string[]) {
  if (fields?.join(",") !== GUILD_HEADERS.join(",")) {
    throw new Error(`${file}: expected headers ${GUILD_HEADERS.join(",")}`);
  }
}

export function loadGuildCsv(file: string, generateMissingIds = false): Guild[] {
  const parsed = Papa.parse<Guild>(readFileSync(file, "utf-8"), papaParseOptions);
  assertHeaders(file, parsed.meta.fields);

  if (parsed.errors.length) {
    throw new Error(
      parsed.errors.map((error) => `${file}:${error.row ?? "?"}: ${error.message}`).join("\n")
    );
  }

  return parsed.data.map((row, index) => {
    const result = Guild.safeParse({
      ...row,
      id: row.id || (generateMissingIds ? generateGuildId(row) : row.id),
    });
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`${file}:${index + 2}: ${issues}`);
    }
    return result.data;
  });
}

export function validateUniqueGuilds(guilds: Guild[]) {
  const ids = new Set<string>();
  const identities = new Set<string>();

  for (const guild of guilds) {
    if (ids.has(guild.id)) {
      throw new Error(`Duplicate guild ID: ${guild.id}`);
    }
    const identity = guildIdentity(guild);
    if (identities.has(identity)) {
      throw new Error(`Duplicate guild identity: ${identity}`);
    }
    ids.add(guild.id);
    identities.add(identity);
  }
}

export function loadGuildSources(): Guild[] {
  const files = globSync(guildPaths.sourceGlob).sort();
  if (!files.length) {
    throw new Error(`No guild source files matched ${guildPaths.sourceGlob}`);
  }

  const guilds = files.flatMap((file) => {
    const records = loadGuildCsv(file);
    const countryDirectory = basename(dirname(file));
    const countries = new Set(records.map((guild) => guild.country));
    const countryCodes = new Set(records.map((guild) => guild.country_code));
    if (countries.size !== 1) {
      throw new Error(`${file}: source shard must contain exactly one country`);
    }
    if (countryCodes.size !== 1) {
      throw new Error(`${file}: source shard must contain exactly one country code`);
    }
    if (regionNames.of(records[0].country_code) !== records[0].country) {
      throw new Error(`${file}: country must match country code ${records[0].country_code}`);
    }
    const expectedDirectory = slugify(records[0].country.toLowerCase(), slugifyOptions);
    if (countryDirectory !== expectedDirectory) {
      throw new Error(`${file}: country must match directory ${countryDirectory}`);
    }

    if (records[0].country_code === "US") {
      for (const guild of records.filter((record) => record.scope !== "national")) {
        const state = guild.subdivision ? usSubdivisions[guild.subdivision] : undefined;
        if (!state || state.abbreviation !== guild.subdivision_code) {
          throw new Error(
            `${file}: ${guild.subdivision_code} does not match subdivision ${guild.subdivision}`
          );
        }
      }
    }
    return records;
  });

  validateUniqueGuilds(guilds);
  return guilds.sort((a, b) => guildIdentity(a).localeCompare(guildIdentity(b)));
}

export function renderGuildCsv(guilds: Guild[]): string {
  return Papa.unparse(guilds, {
    columns: [...GUILD_HEADERS],
    newline: "\n",
    skipEmptyLines: true,
  });
}

export function renderGuildJson(guilds: Guild[]): string {
  return JSON.stringify(guilds);
}

export function renderGuildSql(guilds: Guild[], date = format(new Date(), "yyyyMMdd")): string {
  const pgp = pgpromise({ capSQL: true });
  const columns = new pgp.helpers.ColumnSet([...GUILD_HEADERS], {
    table: { schema: "guilds", table: `guilds_${date}` },
  });
  const template = readFileSync(guildPaths.sqlTemplate, "utf-8");
  const createTable = Mustache.render(template, { date });
  return `${createTable}${pgp.helpers.insert(guilds, columns)};\n`;
}
