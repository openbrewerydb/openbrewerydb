import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { papaParseOptions, headers } from "./config";

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

function loadSnapshotAtCommit(hash: string): Map<string, BreweryRecord> {
  const files = getDataFilesAtCommit(hash);
  const snapshot = new Map<string, BreweryRecord>();

  for (const file of files) {
    let csvContent: string;
    try {
      csvContent = git(`git show ${hash}:${file}`);
    } catch {
      continue;
    }

    const result = Papa.parse<BreweryRecord>(csvContent, {
      ...papaParseOptions,
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

if (require.main === module) {
  main();
}
