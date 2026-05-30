import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { glob } from "glob";
import Papa from "papaparse";
import { Brewery } from "./types";
import { papaParseOptions, headers } from "./config";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// USPS Address Abbreviation Maps
// ---------------------------------------------------------------------------

/** Street suffix abbreviations per USPS Publication 28. */
const USPS_STREET_SUFFIXES: Record<string, string> = {
  alley: "aly",
  avenue: "ave",
  boulevard: "blvd",
  circle: "cir",
  court: "ct",
  drive: "dr",
  expressway: "expy",
  freeway: "fwy",
  highway: "hwy",
  lane: "ln",
  parkway: "pkwy",
  place: "pl",
  road: "rd",
  square: "sq",
  street: "st",
  terrace: "ter",
  trail: "trl",
  way: "way",
};

/** Secondary unit designator abbreviations per USPS. */
const USPS_UNIT_DESIGNATORS: Record<string, string> = {
  apartment: "apt",
  basement: "bsmt",
  building: "bldg",
  department: "dept",
  floor: "fl",
  front: "frnt",
  hanger: "hngr",
  lobby: "lbby",
  lot: "lot",
  lower: "lowr",
  office: "ofc",
  penthouse: "ph",
  room: "rm",
  side: "side",
  space: "spc",
  stop: "stop",
  suite: "ste",
  trailer: "trlr",
  unit: "unit",
  upper: "uppr",
};

/** US state abbreviation → full title-cased name for normalization. */
const US_STATE_ABBREV_TO_NAME: Record<string, string> = {
  al: "Alabama",
  ak: "Alaska",
  az: "Arizona",
  ar: "Arkansas",
  ca: "California",
  co: "Colorado",
  ct: "Connecticut",
  de: "Delaware",
  fl: "Florida",
  ga: "Georgia",
  hi: "Hawaii",
  id: "Idaho",
  il: "Illinois",
  in: "Indiana",
  ia: "Iowa",
  ks: "Kansas",
  ky: "Kentucky",
  la: "Louisiana",
  me: "Maine",
  md: "Maryland",
  ma: "Massachusetts",
  mi: "Michigan",
  mn: "Minnesota",
  ms: "Mississippi",
  mo: "Missouri",
  mt: "Montana",
  ne: "Nebraska",
  nv: "Nevada",
  nh: "New Hampshire",
  nj: "New Jersey",
  nm: "New Mexico",
  ny: "New York",
  nc: "North Carolina",
  nd: "North Dakota",
  oh: "Ohio",
  ok: "Oklahoma",
  or: "Oregon",
  pa: "Pennsylvania",
  ri: "Rhode Island",
  sc: "South Carolina",
  sd: "South Dakota",
  tn: "Tennessee",
  tx: "Texas",
  ut: "Utah",
  vt: "Vermont",
  va: "Virginia",
  wa: "Washington",
  wv: "West Virginia",
  wi: "Wisconsin",
  wy: "Wyoming",
  dc: "District of Columbia",
};

/** Reverse lookup: US state full name (lowercase) → title-cased name. */
const US_STATE_NAMES_TO_TITLE: Record<string, string> = {
  alabama: "Alabama",
  alaska: "Alaska",
  arizona: "Arizona",
  arkansas: "Arkansas",
  california: "California",
  colorado: "Colorado",
  connecticut: "Connecticut",
  delaware: "Delaware",
  florida: "Florida",
  georgia: "Georgia",
  hawaii: "Hawaii",
  idaho: "Idaho",
  illinois: "Illinois",
  indiana: "Indiana",
  iowa: "Iowa",
  kansas: "Kansas",
  kentucky: "Kentucky",
  louisiana: "Louisiana",
  maine: "Maine",
  maryland: "Maryland",
  massachusetts: "Massachusetts",
  michigan: "Michigan",
  minnesota: "Minnesota",
  mississippi: "Mississippi",
  missouri: "Missouri",
  montana: "Montana",
  nebraska: "Nebraska",
  nevada: "Nevada",
  "new hampshire": "New Hampshire",
  "new jersey": "New Jersey",
  "new mexico": "New Mexico",
  "new york": "New York",
  "north carolina": "North Carolina",
  "north dakota": "North Dakota",
  ohio: "Ohio",
  oklahoma: "Oklahoma",
  oregon: "Oregon",
  pennsylvania: "Pennsylvania",
  "rhode island": "Rhode Island",
  "south carolina": "South Carolina",
  "south dakota": "South Dakota",
  tennessee: "Tennessee",
  texas: "Texas",
  utah: "Utah",
  vermont: "Vermont",
  virginia: "Virginia",
  washington: "Washington",
  "west virginia": "West Virginia",
  wisconsin: "Wisconsin",
  wyoming: "Wyoming",
  "district of columbia": "District of Columbia",
};

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes a single address line:
 *   - Trims whitespace
 *   - Collapses multiple spaces
 *   - Standardizes USPS street suffixes to abbreviated form (US only)
 *   - Standardizes secondary unit designators
 *   - Strips surrounding quotes
 *   - Capitalizes first letter of each word (Title Case)
 */
function normalizeStreetAddress(
  address: string | null | undefined,
  country: string
): string | null {
  if (!address) return null;

  let normalized = address.trim();
  if (!normalized) return null;

  // Strip surrounding single/double quotes
  normalized = normalized.replace(/^["']+|["']+$/g, "");

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ");

  if (isUS(country)) {
    // Apply USPS suffix abbreviations (case insensitive, whole word)
    for (const [full, abbr] of Object.entries(USPS_STREET_SUFFIXES)) {
      const re = new RegExp(`\\b${full}\\b`, "gi");
      normalized = normalized.replace(re, abbr);
    }
    // Apply USPS unit designator abbreviations
    for (const [full, abbr] of Object.entries(USPS_UNIT_DESIGNATORS)) {
      const re = new RegExp(`\\b${full}\\b`, "gi");
      normalized = normalized.replace(re, abbr);
    }
    // Normalize "#" to "Unit" for consistency
    normalized = normalized.replace(/#\s*(\d+)/g, "Unit $1");
    normalized = normalized.replace(/#\s*([A-Za-z])/g, "Unit $1");
    // Remove trailing periods from abbreviations (e.g. "St." → "St")
    normalized = normalized.replace(/\b(St|Ave|Blvd|Dr|Ln|Ct|Rd|Ter|Cir)\.\b/gi, "$1");
  }

  // Normalize whitespace around commas
  normalized = normalized.replace(/\s*,\s*/g, ", ");
  // Remove any trailing space-before-comma artifacts (e.g. "Road, " → "Road,")
  normalized = normalized.replace(/,\s+$/g, ",");

  // Title case (US: always; non-US: only for clearly all-lowercase/mixed case input)
  if (isUS(country)) {
    normalized = normalized
      .split(" ")
      .map((word) => titleCaseWord(word))
      .join(" ");
    // Fix title-case after hyphens (e.g. "Am-Brunnen" → first letter after hyphen)
    normalized = normalized.replace(/-([a-z])/g, (_, c) => "-" + c.toUpperCase());
  } else {
    // Non-US: only normalize if the entire address is clearly all-lowercase or all-uppercase
    const hasMixed = /[a-z]/.test(normalized) && /[A-Z]/.test(normalized);
    const isAllUpper = normalized === normalized.toUpperCase();
    const isAllLower = normalized === normalized.toLowerCase();
    if (!hasMixed && (isAllUpper || isAllLower)) {
      normalized = normalized
        .split(" ")
        .map((word) => {
          // Preserve hyphenated parts
          return word.split("-").map((part) => titleCaseWord(part)).join("-");
        })
        .join(" ");
    }
  }

  return normalized;
}

function isUS(country: string): boolean {
  return country.toLowerCase().includes("united states") || country.toLowerCase() === "us" || country.toLowerCase() === "usa";
}

/** Known abbreviation patterns that should be preserved as-is (uppercase, mixed case). */
function preserveKnownAbbreviations(word: string): string | null {
  const upper = word.toUpperCase();
  // US state abbreviations
  if (/^[A-Z]{2}$/.test(word)) return upper;
  // Common directionals
  if (["N", "S", "E", "W", "NE", "NW", "SE", "SW"].includes(upper)) return upper;
  // US highway prefixes
  if (["US", "FM", "SR", "CR", "IH"].includes(upper)) return upper;
  return null;
}

/** Title-case a single word, handling special patterns like Mc*, O'* */
function titleCaseWord(word: string): string {
  if (!word) return word;
  // Check known abbreviations
  const preserved = preserveKnownAbbreviations(word);
  if (preserved) return preserved;
  // Handle alphanumeric like "2B", "1F"
  if (/^\d+[a-zA-Z]$/.test(word)) {
    return word.slice(0, -1) + word.slice(-1).toUpperCase();
  }
  // Handle Mc* and Mac* patterns (e.g., McLaren → McLaren, McDonald → McDonald)
  if (/^mc[a-z]/i.test(word)) {
    return "Mc" + word.slice(2, 3).toUpperCase() + word.slice(3).toLowerCase();
  }
  if (/^mac[a-z]/i.test(word) && word.length > 3) {
    return "Mac" + word.slice(3, 4).toUpperCase() + word.slice(4).toLowerCase();
  }
  // Handle O'* patterns (e.g., O'Brien → O'Brien)
  if (/^o'[a-z]/i.test(word)) {
    return "O'" + word.slice(2, 3).toUpperCase() + word.slice(3).toLowerCase();
  }
  // Default: capitalize first letter
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Normalizes a state/province value.
 * For US: converts full state names to abbreviations, normalizes case.
 * For others: title case.
 */
function normalizeStateProvince(
  state: string | null | undefined,
  country: string
): string | null {
  if (!state) return null;

  const trimmed = state.trim();
  if (!trimmed) return null;

  // --- US: always use title-cased full state names ---
  if (isUS(country)) {
    const lower = trimmed.toLowerCase();
    // Full name → title-cased
    if (US_STATE_NAMES_TO_TITLE[lower]) {
      return US_STATE_NAMES_TO_TITLE[lower];
    }
    // 2-letter abbreviation → full name
    if (/^[a-zA-Z]{2}$/.test(lower) && US_STATE_ABBREV_TO_NAME[lower]) {
      return US_STATE_ABBREV_TO_NAME[lower];
    }
    // Fallback: title-case what we got
    return trimmed
      .split(" ")
      .map((w) => titleCaseWord(w))
      .join(" ");
  }

  // --- Non-US: preserve existing casing if mixed; title-case if all-upper/all-lower ---
  const hasMixed = /[a-z]/.test(trimmed) && /[A-Z]/.test(trimmed);
  if (hasMixed) return trimmed;

  const isAllUpper = trimmed === trimmed.toUpperCase();
  const isAllLower = trimmed === trimmed.toLowerCase();
  if (!isAllUpper && !isAllLower) return trimmed;

  // If it is a known abbreviation (e.g. Australian states NSW, VIC, QLD, etc.),
  // keep it as-is rather than title-casing.
  if (isAllUpper) return trimmed;

  // All-lowercase: title-case, respecting language particles
  const particles = ["von", "der", "an", "bei", "am", "im", "auf", "den", "dem", "des", "und", "zum", "zur", "in", "ob", "unter"];
  return trimmed
    .split(" ")
    .map((w) => {
      if (particles.includes(w.toLowerCase())) return w.toLowerCase();
      return titleCaseWord(w);
    })
    .join(" ");
}

/**
 * Normalizes city name: trim, intelligent title case.
 * Preserves mixed-case names (e.g. German "am Main", Irish "O'Brien")
 * and handles Mc/Mac/O' patterns.
 */
function normalizeCity(city: string | null | undefined): string | null {
  if (!city) return null;

  const trimmed = city.trim();
  if (!trimmed) return null;

  // If already mixed case, assume user entered it correctly
  const hasMixed = /[a-z]/.test(trimmed) && /[A-Z]/.test(trimmed);
  if (hasMixed) return trimmed;

  // German particles that should stay lowercase
  const particles = ["von", "der", "an", "bei", "am", "im", "auf", "den", "dem", "des", "und", "zum", "zur", "in", "ob", "unter"];
  return trimmed
    .split(" ")
    .map((w) => {
      if (particles.includes(w.toLowerCase())) return w.toLowerCase();
      return titleCaseWord(w);
    })
    .join(" ");
}

/**
 * Normalizes a brewery record's address fields **in place**.
 * Returns the same record (for chaining).
 */
function normalizeRecord(brewery: Brewery): Brewery {
  if (brewery.address_1) {
    brewery.address_1 = normalizeStreetAddress(brewery.address_1, brewery.country) as typeof brewery.address_1;
  }
  if (brewery.address_2) {
    brewery.address_2 = normalizeStreetAddress(brewery.address_2, brewery.country) as typeof brewery.address_2;
  }
  if (brewery.address_3) {
    brewery.address_3 = normalizeStreetAddress(brewery.address_3, brewery.country) as typeof brewery.address_3;
  }
  brewery.city = normalizeCity(brewery.city) as typeof brewery.city;
  brewery.state_province = normalizeStateProvince(
    brewery.state_province,
    brewery.country
  ) as typeof brewery.state_province;
  return brewery;
}

// ---------------------------------------------------------------------------
// Diff / reporting
// ---------------------------------------------------------------------------

interface NormalizationChange {
  name: string;
  field: string;
  before: string;
  after: string;
}

/**
 * Compares original vs normalized records and returns a list of changes.
 */
function diffRecords(
  original: Brewery[],
  normalized: Brewery[]
): NormalizationChange[] {
  const changes: NormalizationChange[] = [];

  for (let i = 0; i < original.length; i++) {
    const orig = original[i];
    const norm = normalized[i];
    const fields: (keyof Brewery)[] = [
      "address_1",
      "address_2",
      "address_3",
      "city",
      "state_province",
    ];

    for (const field of fields) {
      const before = (orig[field] ?? "") as string;
      const after = (norm[field] ?? "") as string;
      if (before !== after) {
        changes.push({ name: orig.name, field, before, after });
      }
    }
  }

  return changes;
}

function formatChanges(changes: NormalizationChange[]): string {
  if (!changes.length) {
    return "✅ No address changes needed — all addresses already normalized.";
  }

  const lines = [
    `## 🏠 Address Normalization Changes (${changes.length} changes)`,
    "",
    "| Brewery | Field | Before | After |",
    "|---------|-------|--------|-------|",
  ];

  changes.forEach((c) => {
    lines.push(`| ${c.name} | ${c.field} | "${c.before}" | "${c.after}" |`);
  });

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const main = () => {
  const startTime = Date.now();
  console.log("Normalizing addresses...\n");

  // Validation gate: ensure data is valid before modifying
  console.log("Running validation gate...");
  try {
    execSync("npm run validate", { cwd: join(__dirname, "../"), stdio: "inherit" });
  } catch (error) {
    console.error("\n❌ Validation failed. Address normalization aborted.");
    process.exit(1);
  }
  console.log("✅ Validation passed. Proceeding with normalization.\n");

  // Find all CSV files under data/
  const csvFiles = glob.sync("data/**/*.csv", { cwd: join(__dirname, "../") });
  console.log(`Found ${csvFiles.length} CSV files to process.\n`);

  let totalChanges = 0;
  const allChanges: NormalizationChange[] = [];

  for (const csvFile of csvFiles) {
    const csvPath = join(__dirname, "../", csvFile);
    const csv = readFileSync(csvPath, { encoding: "utf-8" });
    const original = Papa.parse<Brewery>(csv, papaParseOptions).data;

    // Deep clone for comparison
    const cloned = original.map((b) => ({ ...b }));

    // Normalize all records
    const normalized = cloned.map((b) => normalizeRecord(b));

    // Track changes
    const changes = diffRecords(original, normalized);
    if (changes.length > 0) {
      totalChanges += changes.length;
      allChanges.push(...changes);
      console.log(`${csvFile}: ${changes.length} changes`);

      // Write normalized CSV back to file
      writeFileSync(
        csvPath,
        Papa.unparse(normalized, {
          columns: headers,
          skipEmptyLines: true,
        })
      );
    }
  }

  // Report summary
  const report = formatChanges(allChanges);
  console.log("\n" + report);

  console.log(`\n✨ Normalized in ${Date.now() - startTime}ms`);
  console.log(`  ${totalChanges} address fields updated across ${csvFiles.length} files.`);
  console.log("\n⚠️  Run 'npm run workflow:maintain' to regenerate breweries.csv, breweries.json, and breweries.sql");
};

if (require.main === module) {
  main();
}

export {
  normalizeStreetAddress,
  normalizeStateProvince,
  normalizeCity,
  normalizeRecord,
  diffRecords,
};
