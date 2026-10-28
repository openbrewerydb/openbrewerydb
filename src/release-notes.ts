import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import { papaParseOptions } from "./config.ts";

type Row = Record<string, unknown>;
type Counts = { added: number; removed: number; changed: number };
export type Table = { fields: string[]; rows: Row[] };

const region = (r: Row) => `${r.country} / ${r.state_province}`;

export function diff(prev: Table, cur: Table) {
  const shared = cur.fields.filter((f) => prev.fields.includes(f));
  const before = new Map(prev.rows.map((r) => [r.id, r]));
  const after = new Map(cur.rows.map((r) => [r.id, r]));
  const regions = new Map<string, Counts>();
  const bump = (key: string, k: keyof Counts) => {
    const c = regions.get(key) ?? { added: 0, removed: 0, changed: 0 };
    c[k]++;
    regions.set(key, c);
  };
  let added = 0, removed = 0, changed = 0;

  for (const [id, r] of after) {
    const old = before.get(id);
    if (!old) { added++; bump(region(r), "added"); continue; }
    if (!shared.some((f) => String(old[f] ?? "") !== String(r[f] ?? ""))) continue;
    changed++;
    // A brewery that moved region counts as removed from the old one and added to the new one.
    if (region(old) !== region(r)) { bump(region(old), "removed"); bump(region(r), "added"); }
    else bump(region(r), "changed");
  }
  for (const [id, r] of before) if (!after.has(id)) { removed++; bump(region(r), "removed"); }

  return {
    prevTotal: prev.rows.length,
    total: cur.rows.length,
    added, removed, changed,
    regions: new Map([...regions].sort(([a], [b]) => a.localeCompare(b, "en"))),
    addedColumns: cur.fields.filter((f) => !prev.fields.includes(f)),
    removedColumns: prev.fields.filter((f) => !cur.fields.includes(f)),
  };
}

const fmt = (n: number) => n.toLocaleString("en-US");
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));

export function render(cur: Table, prev?: { tag: string; table: Table }): string {
  if (!prev) {
    const byCountry = new Map<string, number>();
    for (const r of cur.rows) byCountry.set(String(r.country), (byCountry.get(String(r.country)) ?? 0) + 1);
    return [
      `Initial release: **${fmt(cur.rows.length)}** breweries.`,
      "",
      "| Country | Breweries |",
      "|---|---:|",
      ...[...byCountry].sort(([a], [b]) => a.localeCompare(b, "en")).map(([c, n]) => `| ${c} | ${fmt(n)} |`),
    ].join("\n");
  }

  const d = diff(prev.table, cur);
  const out = [
    `**${fmt(d.total)}** breweries (${signed(d.total - d.prevTotal)} since ${prev.tag}): ` +
      `${fmt(d.added)} added, ${fmt(d.removed)} removed, ${fmt(d.changed)} changed.`,
  ];
  if (d.addedColumns.length || d.removedColumns.length) {
    out.push("", `> ⚠ **Schema change**: added columns [${d.addedColumns.join(", ")}], removed columns [${d.removedColumns.join(", ")}].`);
  }
  if (d.regions.size) {
    out.push("", "| Country / Region | Added | Removed | Changed | Net |", "|---|---:|---:|---:|---:|");
    for (const [key, c] of d.regions) out.push(`| ${key} | ${fmt(c.added)} | ${fmt(c.removed)} | ${fmt(c.changed)} | ${signed(c.added - c.removed)} |`);
  }
  return out.join("\n");
}

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

function load(ref: string): Table {
  const { data, meta } = Papa.parse<Row>(git("show", `${ref}:breweries.csv`), papaParseOptions);
  return { fields: meta.fields ?? [], rows: data };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ref = process.argv[2] ?? "HEAD";
  let prevTag: string | undefined;
  try {
    prevTag = git("describe", "--tags", "--abbrev=0", "--match", "v[0-9][0-9][0-9][0-9].*", `${ref}^`).trim();
  } catch {
    // No earlier release tag: this is the initial release.
  }
  console.log(render(load(ref), prevTag ? { tag: prevTag, table: load(prevTag) } : undefined));
}
