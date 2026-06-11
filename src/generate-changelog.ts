import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { papaParseOptions, headers } from "./config";

// The first commit where brewery records were assigned stable UUIDs (2023-03-24).
// All history extraction starts here — earlier commits used slug-based IDs that aren't stable.
const GROUND_ZERO = "2dac1f54f86eafc8cb017d98642000069af09b11";
const REPO_ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(REPO_ROOT, "breweries_changelog.csv");

const CHANGELOG_HEADERS = [
  "commit_hash",
  "commit_date",
  "change_type",
  "changed_fields",
  ...headers,
];

export type ChangeType = "added" | "modified" | "deleted";

type ChangeRow = {
  commit_hash: string;
  commit_date: string;
  change_type: ChangeType;
  changed_fields: string;
} & Record<string, string | null>;

export type BreweryRecord = Record<string, string | null>;

function git(cmd: string): string {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: "utf-8" });
}

function getCommitList(): Array<{ hash: string; date: string }> {
  // %H = full commit hash, %as = author date (YYYY-MM-DD). --reverse gives oldest-first order.
  // The ^ suffix on GROUND_ZERO means "include the ground-zero commit itself" (one before its parent).
  // -- data/ limits the log to commits that touched files under the data/ directory.
  const log = git(
    `git log --format="%H %as" --reverse ${GROUND_ZERO}^..HEAD -- data/`
  ).trim();

  return log
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, date] = line.trim().split(" ");
      return { hash, date };
    });
}

function getDataFilesAtCommit(hash: string): string[] {
  const result = git(
    `git ls-tree -r --name-only ${hash} -- data/`
  ).trim();
  return result
    .split("\n")
    .filter((f) => f.endsWith(".csv") && f.startsWith("data/"));
}

// Reads all data/ CSV files at a specific commit and returns a Map of brewery_id → row.
// Using a Map keyed by UUID lets us do O(1) lookups when diffing against the previous commit.
function loadSnapshotAtCommit(hash: string): Map<string, BreweryRecord> {
  const files = getDataFilesAtCommit(hash);
  const snapshot = new Map<string, BreweryRecord>();

  for (const file of files) {
    let csvContent: string;
    try {
      // `git show <hash>:<path>` reads the file contents as they existed at that commit,
      // without checking out the commit or modifying the working directory.
      csvContent = git(`git show ${hash}:${file}`);
    } catch {
      // File may have been deleted or renamed in this commit — skip it gracefully.
      continue;
    }

    const result = Papa.parse<BreweryRecord>(csvContent, {
      ...papaParseOptions,
      // Keep all values as strings so field comparisons in diffSnapshots are consistent.
      // Without this, numeric fields like longitude would be parsed as numbers.
      dynamicTyping: false,
    });

    for (const row of result.data) {
      const id = row["id"];
      if (!id || typeof id !== "string" || !id.trim()) continue;
      snapshot.set(id.trim(), row);
    }
  }

  return snapshot;
}

// Treats null, undefined, and empty string as equivalent so that whitespace-only
// changes or missing-vs-empty differences don't generate false positives in the diff.
export function normalizeValue(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v).trim();
}

export function rowToChangeRow(
  hash: string,
  date: string,
  changeType: ChangeType,
  changedFields: string,
  record: BreweryRecord
): ChangeRow {
  const row: ChangeRow = {
    commit_hash: hash.slice(0, 7),
    commit_date: date,
    change_type: changeType,
    changed_fields: changedFields,
  };
  for (const field of headers) {
    row[field] = normalizeValue(record[field]);
  }
  return row;
}

export function diffSnapshots(
  hash: string,
  date: string,
  prev: Map<string, BreweryRecord>,
  curr: Map<string, BreweryRecord>
): ChangeRow[] {
  const rows: ChangeRow[] = [];

  // Walk current snapshot: anything new is "added", anything changed is "modified".
  for (const [id, currRow] of curr) {
    if (!prev.has(id)) {
      rows.push(rowToChangeRow(hash, date, "added", "", currRow));
    } else {
      const prevRow = prev.get(id)!;
      const changedFields = headers.filter((field) => {
        return normalizeValue(prevRow[field]) !== normalizeValue(currRow[field]);
      });
      if (changedFields.length > 0) {
        rows.push(
          rowToChangeRow(hash, date, "modified", changedFields.join("|"), currRow)
        );
      }
    }
  }

  // Walk previous snapshot: anything no longer in current is "deleted".
  // Note: if a UUID moved between CSV files in the same commit, it will appear in
  // both snapshots and correctly produce no diff row.
  for (const [id, prevRow] of prev) {
    if (!curr.has(id)) {
      rows.push(rowToChangeRow(hash, date, "deleted", "", prevRow));
    }
  }

  return rows;
}

function main(): void {
  console.log("🔍 Fetching commit list...");
  const commits = getCommitList();
  console.log(`   ${commits.length} commits to process (ground-zero → HEAD)`);

  const allRows: ChangeRow[] = [];
  let prevSnapshot = new Map<string, BreweryRecord>();

  for (let i = 0; i < commits.length; i++) {
    const { hash, date } = commits[i];
    const shortHash = hash.slice(0, 7);
    process.stdout.write(
      `\r   [${i + 1}/${commits.length}] ${shortHash} ${date}`
    );

    const currSnapshot = loadSnapshotAtCommit(hash);
    const rows = diffSnapshots(hash, date, prevSnapshot, currSnapshot);
    allRows.push(...rows);
    prevSnapshot = currSnapshot;
  }

  process.stdout.write("\n");

  console.log(`📊 Total change rows: ${allRows.length.toLocaleString()}`);
  console.log("🔃 Sorting...");

  allRows.sort((a, b) => {
    if (a.commit_date !== b.commit_date)
      return a.commit_date.localeCompare(b.commit_date);
    if (a.commit_hash !== b.commit_hash)
      return a.commit_hash.localeCompare(b.commit_hash);
    const aId = (a["id"] ?? "") as string;
    const bId = (b["id"] ?? "") as string;
    if (aId !== bId) return aId.localeCompare(bId);
    return a.change_type.localeCompare(b.change_type);
  });

  console.log(`✍️  Writing ${OUTPUT_PATH}...`);
  const csv = Papa.unparse(allRows, {
    columns: CHANGELOG_HEADERS,
    skipEmptyLines: true,
  });
  writeFileSync(OUTPUT_PATH, csv, { encoding: "utf-8" });

  console.log(`✅ Done. ${allRows.length.toLocaleString()} rows written.`);
}

// Only run main() when this file is executed directly (e.g. `npm run generate:changelog`).
// When imported by tests, main() is skipped so the test suite doesn't trigger a full git walk.
if (require.main === module) {
  main();
}
