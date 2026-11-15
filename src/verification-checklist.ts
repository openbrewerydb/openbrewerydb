/**
 * Human verification checklist for brewery data pull requests.
 *
 * For every PR that changes `data/**\/*.csv`, this script:
 *   1. Compares the PR's CSV files with the base branch, row by row.
 *   2. Writes a checklist (one item per added/updated/removed brewery) into the PR description.
 *      The contributor ticks each item after checking that change by hand.
 *   3. Sets a `human-verification` commit status that passes once every item is ticked.
 *   4. When the description is edited, records who ticked what (and when) in a log comment
 *      that only maintainers can edit, so they can spot ticking done in bulk or by a bot.
 *
 * Dry run is the default. Nothing is written to GitHub unless VERIFICATION_APPLY=true.
 *
 * Run locally (prints the checklist, never calls GitHub):
 *   node --experimental-strip-types src/verification-checklist.ts origin/master <pr-ref>
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Papa from "papaparse";

// The checklist lives between these markers so it can be found and replaced on each run
// without touching the rest of the PR description.
export const CHECKLIST_START = "<!-- obdb-verification:start -->";
export const CHECKLIST_END = "<!-- obdb-verification:end -->";
const TICK_LOG_MARKER = "<!-- obdb-verification-log -->";

export const MAX_ITEMS = 200;
const STATUS_CONTEXT = "human-verification";
const BULK_TICK_THRESHOLD = 10;

type CsvRow = Record<string, string>;

export type ChecklistItem = {
  file: string;
  action: "Add" | "Update" | "Remove";
  breweryName: string;
  location: string;
  changedFields: string[];
  /**
   * Identifies the checkbox, written as a hidden `<!-- k:... -->` comment after the item.
   * Format: `<brewery identity hash>.<row content hash>`.
   * The content hash is part of the key so that, when a contributor pushes a new edit to a row,
   * the key changes and the old tick no longer matches. That row has to be checked again.
   */
  tickKey: string;
};

const sha1 = (text: string) => createHash("sha1").update(text).digest("hex");

/**
 * CSV values come from untrusted contributors and end up in Markdown. Removing these characters
 * keeps a brewery name from breaking the layout, or from faking a `<!-- k:... -->` tick key.
 */
export const sanitize = (text = "") => text.replace(/[<>`[\]|\r\n]/g, "").trim();

/**
 * Indexes rows by a stable identity so base and head rows can be matched.
 * New rows don't get an `id` until the maintainer assigns one at merge time, so those fall back to name + city.
 */
function indexRowsByIdentity(csv: string) {
  const rowsByIdentity = new Map<string, CsvRow>();
  const rows = Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: true }).data;
  for (const row of rows) {
    let identity = row.id?.trim() || `${row.name?.trim()}|${row.city?.trim()}`;
    // Keep accidental duplicates as separate entries instead of silently overwriting one.
    while (rowsByIdentity.has(identity)) identity += "+";
    rowsByIdentity.set(identity, row);
  }
  return rowsByIdentity;
}

function changedFieldsBetween(oldRow: CsvRow, newRow: CsvRow) {
  return Object.keys(newRow).filter(
    (field) => (newRow[field] ?? "").trim() !== (oldRow[field] ?? "").trim(),
  );
}

/** Compares one CSV file at base and head, and returns a checklist item per changed brewery. */
export function diffRows(file: string, baseCsv: string, headCsv: string): ChecklistItem[] {
  const baseRows = indexRowsByIdentity(baseCsv);
  const headRows = indexRowsByIdentity(headCsv);

  const makeItem = (
    action: ChecklistItem["action"],
    identity: string,
    row: CsvRow,
    changedFields: string[] = [],
  ): ChecklistItem => ({
    file,
    action,
    breweryName: sanitize(row.name),
    location: [row.city, row.state_province].map(sanitize).filter(Boolean).join(", "),
    changedFields: changedFields.map(sanitize),
    tickKey: `${sha1(`${file}|${identity}`).slice(0, 12)}.${sha1(JSON.stringify(row)).slice(0, 8)}`,
  });

  const items: ChecklistItem[] = [];

  for (const [identity, headRow] of headRows) {
    const baseRow = baseRows.get(identity);
    if (!baseRow) {
      items.push(makeItem("Add", identity, headRow));
      continue;
    }
    const changedFields = changedFieldsBetween(baseRow, headRow);
    if (changedFields.length > 0) items.push(makeItem("Update", identity, headRow, changedFields));
  }

  for (const [identity, baseRow] of baseRows) {
    if (!headRows.has(identity)) items.push(makeItem("Remove", identity, baseRow));
  }

  return items;
}

/**
 * The key for the "I personally checked..." attestation is built from every item key, so it
 * resets whenever any item is added, removed, or changed.
 */
export function attestationKey(items: ChecklistItem[]) {
  const allItemKeys = items.map((item) => item.tickKey).join();
  return `attest.${sha1(allItemKeys).slice(0, 8)}`;
}

/** All keys that must be ticked for the PR to pass: the attestation plus one per item. */
export function requiredTickKeys(items: ChecklistItem[]) {
  return new Set([attestationKey(items), ...items.map((item) => item.tickKey)]);
}

/** Finds every ticked checkbox in a PR description and returns its hidden key. */
export function findTickedKeys(body = "") {
  const tickedLine = /^\s*[-*] \[[xX]\] .*<!-- k:([\w.]+) -->\s*$/gm;
  return new Set([...body.matchAll(tickedLine)].map((match) => match[1]));
}

export function renderChecklist(items: ChecklistItem[], tickedKeys: Set<string>) {
  const checkbox = (key: string) => (tickedKeys.has(key) ? "- [x]" : "- [ ]");
  const lines = [CHECKLIST_START, "## Human verification", ""];

  if (items.length > MAX_ITEMS) {
    lines.push(
      `This PR changes ${items.length} breweries (limit ${MAX_ITEMS}). ` +
        "Please split it into smaller PRs so each change can be verified.",
      CHECKLIST_END,
    );
    return lines.join("\n");
  }

  const attestation = attestationKey(items);
  lines.push(
    "Tick each item only after you have personally checked it against its source. Ticks reset when a row changes.",
    "",
    `${checkbox(attestation)} **I personally checked each change below against its source (not automated).** <!-- k:${attestation} -->`,
  );

  let currentFile = "";
  for (const item of items) {
    if (item.file !== currentFile) {
      currentFile = item.file;
      lines.push("", `**\`${sanitize(currentFile)}\`**`, "");
    }
    const location = item.location ? ` (${item.location})` : "";
    const fields = item.changedFields.length > 0 ? `: ${item.changedFields.join(", ")}` : "";
    lines.push(`${checkbox(item.tickKey)} ${item.action}: ${item.breweryName}${location}${fields} <!-- k:${item.tickKey} -->`);
  }

  lines.push(CHECKLIST_END);
  return lines.join("\n");
}

/** Replaces the checklist section in the PR description, or appends it if it isn't there yet. */
export function replaceChecklistInBody(body: string, checklist: string) {
  const start = body.indexOf(CHECKLIST_START);
  const end = body.indexOf(CHECKLIST_END, start);
  if (start === -1 || end === -1) return `${body.trimEnd()}\n\n${checklist}\n`;
  return body.slice(0, start) + checklist + body.slice(end + CHECKLIST_END.length);
}

export function verificationStatus(items: ChecklistItem[], tickedKeys: Set<string>) {
  if (items.length > MAX_ITEMS) {
    return { state: "failure", description: `${items.length} changes; please split into PRs of at most ${MAX_ITEMS}` };
  }
  const required = requiredTickKeys(items);
  const tickedCount = [...required].filter((key) => tickedKeys.has(key)).length;
  return {
    state: tickedCount === required.size ? "success" : "pending",
    description: `${tickedCount}/${required.size} verified`,
  };
}

// --- Reading the PR's changes from git -------------------------------------------------------

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

/** File contents at a commit, or "" if the file doesn't exist there (newly added or deleted). */
function fileAtCommit(commit: string, file: string) {
  try {
    return git("show", `${commit}:${file}`);
  } catch {
    return "";
  }
}

/**
 * Lists every brewery change between two git refs. PR files are only read as data with `git show`.
 * They are never checked out or executed (see the workflow file for why that matters).
 */
export function collectChangesFromGit(baseRef: string, headRef: string) {
  // Diff against the merge base, like GitHub's "Files changed" tab, so that commits landing on
  // master after the PR was opened don't appear as changes in the PR.
  const mergeBase = git("merge-base", baseRef, headRef).trim();
  const changedFiles = git("diff", "--name-only", mergeBase, headRef, "--", ":(glob)data/**/*.csv")
    .split("\n")
    .filter(Boolean);
  return changedFiles.flatMap((file) =>
    diffRows(file, fileAtCommit(mergeBase, file), fileAtCommit(headRef, file)),
  );
}

// --- GitHub API ------------------------------------------------------------------------------

async function githubApi(method: string, path: string, body?: unknown) {
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

const applyChanges = process.env.VERIFICATION_APPLY === "true";

/** Every write to GitHub goes through here, so that dry run (the default) only prints what would happen. */
async function writeToGitHub(method: string, path: string, body: unknown) {
  if (applyChanges) return githubApi(method, path, body);
  console.log(`[dry-run] ${method} ${path}\n${JSON.stringify(body, null, 2)}`);
}

async function appendToTickLog(prNumber: number, row: string) {
  const header = [
    TICK_LOG_MARKER,
    "## Human verification log",
    "",
    "| Time (UTC) | Who | Account type | Ticked | Unticked | Since PR opened | Flag |",
    "|---|---|---|---|---|---|---|",
  ].join("\n");

  for (let page = 1; ; page++) {
    const comments = await githubApi("GET", `/issues/${prNumber}/comments?per_page=100&page=${page}`);
    // Only trust a log comment posted by the bot, since anyone could post a comment containing the marker.
    const logComment = comments.find((c: any) => c.user.type === "Bot" && c.body.startsWith(TICK_LOG_MARKER));
    if (logComment) {
      return writeToGitHub("PATCH", `/issues/comments/${logComment.id}`, { body: `${logComment.body}\n${row}` });
    }
    const isLastPage = comments.length < 100;
    if (isLastPage) return writeToGitHub("POST", `/issues/${prNumber}/comments`, { body: `${header}\n${row}` });
  }
}

// --- Entry points ----------------------------------------------------------------------------

function runLocally(baseRef: string, headRef: string) {
  const items = collectChangesFromGit(baseRef, headRef);
  console.log(renderChecklist(items, new Set()));
  console.log(verificationStatus(items, new Set()));
}

async function runInWorkflow(eventPath: string) {
  const event = JSON.parse(readFileSync(eventPath, "utf8"));
  const prNumber = event.pull_request.number;
  if (!applyChanges) console.log("Dry run: set repo variable VERIFICATION_APPLY=true to write to GitHub.");

  // Fetch the PR fresh instead of using the event payload: runs are queued per PR, so by the time
  // this one starts the description may have changed again.
  const pr = await githubApi("GET", `/pulls/${prNumber}`);
  const currentBody: string = pr.body ?? "";

  const items = collectChangesFromGit(pr.base.sha, pr.head.sha);
  const required = requiredTickKeys(items);
  // Only count ticks whose key matches a current change. Ticks on rows changed since, or on
  // lines typed in by hand, are dropped.
  const tickedKeys = new Set([...findTickedKeys(currentBody)].filter((key) => required.has(key)));

  // Edits made with the workflow's GITHUB_TOKEN don't trigger new workflow runs, so this can't loop.
  const updatedBody = replaceChecklistInBody(currentBody, renderChecklist(items, tickedKeys));
  if (updatedBody !== currentBody) await writeToGitHub("PATCH", `/pulls/${prNumber}`, { body: updatedBody });

  await writeToGitHub("POST", `/statuses/${pr.head.sha}`, {
    context: STATUS_CONTEXT,
    ...verificationStatus(items, tickedKeys),
  });

  // GitHub includes the previous description only when the description itself was edited
  // (not the title), which lets us work out what this edit ticked.
  const previousBody = event.changes?.body?.from;
  if (event.action !== "edited" || previousBody === undefined) return;

  const tickedBefore = findTickedKeys(previousBody);
  const newlyTicked = [...tickedKeys].filter((key) => !tickedBefore.has(key)).length;
  const newlyUnticked = [...tickedBefore].filter((key) => required.has(key) && !tickedKeys.has(key)).length;
  if (newlyTicked === 0 && newlyUnticked === 0) return;

  const tickedEverythingAtOnce = newlyTicked > 1 && newlyTicked === required.size;
  const flag = newlyTicked >= BULK_TICK_THRESHOLD || tickedEverythingAtOnce ? "**BULK**" : "";
  const minutesSinceOpened = Math.round((Date.now() - Date.parse(pr.created_at)) / 60_000);
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

  await appendToTickLog(
    prNumber,
    `| ${timestamp} | @${event.sender.login} | ${event.sender.type} | ${newlyTicked} | ${newlyUnticked} | ${minutesSinceOpened} min | ${flag} |`,
  );
}

if (import.meta.main) {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) await runInWorkflow(eventPath);
  else runLocally(process.argv[2], process.argv[3]);
}
