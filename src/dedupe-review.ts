import * as readline from "readline";
import { join } from "path";
import {
  DedupCandidate,
  Resolution,
  loadCandidates,
  loadResolutions,
  saveResolutions,
} from "./dedupe-candidates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rlInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim().toLowerCase()));
  });
}

function clearLine() {
  readline.cursorTo(process.stdout, 0);
  process.stdout.write("\r\u001b[K");
}

function printSeparator() {
  console.log("─".repeat(72));
}

function confidenceBadge(confidence: string): string {
  switch (confidence) {
    case "high":
      return "🟢 HIGH  ";
    case "medium":
      return "🟡 MEDIUM";
    case "low":
      return "🔴 LOW   ";
    default:
      return `  ${confidence}`;
  }
}

// ---------------------------------------------------------------------------
// Display a single candidate
// ---------------------------------------------------------------------------

function showCandidate(c: DedupCandidate, total: number, resolutions: Resolution[], candidates: DedupCandidate[]) {
  const existing = resolutions.find((r) => r.hash === c.hash);
  const status = existing
    ? existing.action === "confirmed"
      ? "✅ CONFIRMED"
      : existing.action === "rejected"
        ? "❌ REJECTED"
        : "⏭ SKIPPED"
    : "⬜ PENDING";

  console.log("");
  printSeparator();
  const displayIndex = candidates.findIndex((cand) => cand.hash === c.hash) + 1;
  console.log(
    `  Pair ${displayIndex}/${total}  ·  Similarity: ${(c.similarity * 100).toFixed(1)}%  ·  ${confidenceBadge(c.confidence)}  ·  ${status}`
  );
  printSeparator();
  console.log("");
  console.log(`  📍 Address:  ${c.keep.address_1 || "(missing)"}`);
  console.log(
    `              ${c.keep.city}, ${c.keep.state_province}, ${c.keep.country}`
  );
  console.log(`  📎 Match:   ${c.reason}`);
  console.log("");
  console.log(`  KEEP:   "${c.keep.name}" (${c.keep.brewery_type})`);
  console.log(`          id: ${c.keep.id || "(none)"}`);
  if (c.keep.phone) console.log(`          📞 ${c.keep.phone}`);
  if (c.keep.website_url) console.log(`          🌐 ${c.keep.website_url}`);
  if (c.keep.longitude && c.keep.latitude)
    console.log(`          📌 ${c.keep.longitude}, ${c.keep.latitude}`);

  console.log("");
  console.log(`  REMOVE: "${c.remove.name}" (${c.remove.brewery_type})`);
  console.log(`          id: ${c.remove.id || "(none)"}`);
  if (c.remove.phone) console.log(`          📞 ${c.remove.phone}`);
  if (c.remove.website_url) console.log(`          🌐 ${c.remove.website_url}`);
  if (c.remove.longitude && c.remove.latitude)
    console.log(`          📌 ${c.remove.longitude}, ${c.remove.latitude}`);

  // Show name diff hint
  console.log("");
  const simHint = c.similarity >= 0.95 ? "Near-identical names" : c.similarity >= 0.90 ? "Very similar names" : "Similar names";
  console.log(`  💡 ${simHint}`);
  console.log("");
}

function showHelp() {
  console.log("");
  console.log("  Commands:");
  console.log("    y / enter  — Confirm: remove the flagged duplicate (KEEP the other)");
  console.log("    n          — Reject: these are NOT duplicates, keep both");
  console.log("    s          — Skip: decide later");
  console.log("    a          — Auto-approve: confirm all remaining HIGH-confidence pairs");
  console.log("    r          — Reset: undo resolution on go back to previous pair");
  console.log("    b          — Back: go to previous pair");
  console.log("    j <num>    — Jump to pair number");
  console.log("    l          — List all pairs with status");
  console.log("    h          — Show this help");
  console.log("    q          — Quit (save progress)");
  console.log("");
}

function showSummary(candidates: DedupCandidate[], resolutions: Resolution[]) {
  const confirmed = resolutions.filter((r) => r.action === "confirmed").length;
  const rejected = resolutions.filter((r) => r.action === "rejected").length;
  const skipped = resolutions.filter((r) => r.action === "skipped").length;
  const pending = candidates.length - confirmed - rejected - skipped;

  console.log("");
  printSeparator();
  console.log(
    `  Summary: ${confirmed} confirmed · ${rejected} rejected · ${skipped} skipped · ${pending} pending`
  );
  printSeparator();
}

function showList(candidates: DedupCandidate[], resolutions: Resolution[], currentIndex: number) {
  console.log("");
  printSeparator();
  console.log("  All pairs:");
  candidates.forEach((c, i) => {
    const r = resolutions.find((res) => res.hash === c.hash);
    const icon =
      r?.action === "confirmed"
        ? "✅"
        : r?.action === "rejected"
          ? "❌"
          : r?.action === "skipped"
            ? "⏭"
            : "⬜";
    const pointer = i === currentIndex ? "→" : " ";
    console.log(
      `    ${pointer} ${icon} ${(i + 1).toString().padStart(3)}. ${(c.similarity * 100).toFixed(1)}%  ${c.remove.name}`
    );
  });
  printSeparator();
}

// ---------------------------------------------------------------------------
// Main review loop
// ---------------------------------------------------------------------------

async function review() {
  const candidatesPath = join(__dirname, "../dedupe-candidates.json");
  const resolutionsPath = join(__dirname, "../dedupe-resolutions.json");

  let candidates: DedupCandidate[];
  try {
    candidates = loadCandidates(candidatesPath);
  } catch {
    console.log("❌ No candidates file found. Run `npm run dedupe` first.");
    process.exit(1);
  }

  const resolutions = loadResolutions(resolutionsPath);

  if (candidates.length === 0) {
    console.log("✅ No duplicate candidates found — dataset is clean!");
    return;
  }

  const rl = rlInterface();
  let currentIdx = 0;

  // Skip already-resolved pairs (confirmed/rejected, but not skipped)
  while (currentIdx < candidates.length && isResolved(candidates[currentIdx].hash, resolutions)) {
    currentIdx++;
  }

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║              🍺  Brewery Dedup Review Tool                       ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  ${candidates.length} duplicate candidate pairs found.`);
  const alreadyResolved = dedupedResolutionCount(resolutions);
  console.log(`  ${alreadyResolved} already resolved.`);
  console.log("");
  console.log("  Commands: [y] confirm · [n] reject · [s] skip · [a] auto-approve · [b] back");
  console.log("            [l] list · [j #] jump · [r] reset · [h] help · [q] quit");

  while (currentIdx < candidates.length) {
    const candidate = candidates[currentIdx];
    showCandidate(candidate, candidates.length, resolutions, candidates);

    const input = await ask(
      rl,
      `  Action [y/n/s/a/b/l/h/q] (${currentIdx + 1}/${candidates.length}): `
    );

    if (input === "y" || input === "") {
      upsertResolution(resolutions, {
        hash: candidate.hash,
        removeId: candidate.remove.id || candidate.remove.name,
        keepId: candidate.keep.id || candidate.keep.name,
        action: "confirmed",
        resolvedAt: new Date().toISOString(),
      });
      currentIdx++;
    } else if (input === "n") {
      upsertResolution(resolutions, {
        hash: candidate.hash,
        removeId: null,
        keepId: candidate.keep.id || candidate.keep.name,
        action: "rejected",
        resolvedAt: new Date().toISOString(),
      });
      currentIdx++;
    } else if (input === "s") {
      upsertResolution(resolutions, {
        hash: candidate.hash,
        removeId: null,
        keepId: candidate.keep.id || candidate.keep.name,
        action: "skipped",
        resolvedAt: new Date().toISOString(),
      });
      currentIdx++;
    } else if (input === "a") {
      // Count remaining unresolved pairs by confidence
      const remaining = candidates.slice(currentIdx).filter((c) => !isResolved(c.hash, resolutions));
      const highConfCount = remaining.filter((c) => c.confidence === "high").length;
      const medConfCount = remaining.filter((c) => c.confidence === "medium").length;
      const lowConfCount = remaining.filter((c) => c.confidence === "low").length;

      console.log(`  Remaining unresolved: ${remaining.length} total`);
      console.log(`    🟢 High:   ${highConfCount}  → will be CONFIRMED (remove duplicate)`);
      console.log(`    🟡 Medium: ${medConfCount}  → will be SKIPPED (review later)`);
      console.log(`    🔴 Low:    ${lowConfCount}  → will be SKIPPED (review later)`);

      const confirmAll = await ask(
        rl,
        `  Proceed? [y/n]: `
      );
      if (confirmAll === "y" || confirmAll === "") {
        let confirmed = 0;
        for (let i = currentIdx; i < candidates.length; i++) {
          const c = candidates[i];
          if (isResolved(c.hash, resolutions)) continue;
          if (c.confidence === "high") {
            upsertResolution(resolutions, {
              hash: c.hash,
              removeId: c.remove.id || c.remove.name,
              keepId: c.keep.id || c.keep.name,
              action: "confirmed",
              resolvedAt: new Date().toISOString(),
            });
            confirmed++;
          } else {
            upsertResolution(resolutions, {
              hash: c.hash,
              removeId: null,
              keepId: c.keep.id || c.keep.name,
              action: "skipped",
              resolvedAt: new Date().toISOString(),
            });
          }
        }
        // After auto-approve, advance to the end
        currentIdx = candidates.length;
        console.log(`  ✅ Auto-approved ${confirmed} high-confidence pairs, skipped the rest.`);
      }
    } else if (input === "b") {
      if (currentIdx > 0) {
        currentIdx--;
        // Remove ALL resolutions for the pair we're going back to
        removeAllResolutionsForHash(resolutions, candidates[currentIdx].hash);
      }
    } else if (input === "r") {
      // Reset all resolutions and start over
      resolutions.length = 0;
      currentIdx = 0;
      console.log("  🔄 Reset all resolutions. Starting from the beginning.");
    } else if (input.startsWith("j ")) {
      const num = parseInt(input.slice(2), 10);
      if (!isNaN(num) && num >= 1 && num <= candidates.length) {
        currentIdx = num - 1;
      } else {
        console.log(`  ⚠️  Invalid pair number. Range: 1-${candidates.length}`);
      }
    } else if (input === "l") {
      showList(candidates, resolutions, currentIdx);
    } else if (input === "h") {
      showHelp();
    } else if (input === "q") {
      break;
    } else {
      console.log("  ⚠️  Unknown command. Press [h] for help.");
    }

    // Skip resolved pairs going forward
    while (currentIdx < candidates.length && isResolved(candidates[currentIdx].hash, resolutions)) {
      currentIdx++;
    }
  }

  rl.close();

  // Save progress
  saveResolutions(resolutions, resolutionsPath);

  const summary = resolutionSummary(resolutions);
  console.log("");
  printSeparator();
  console.log(
    `  Summary: ${summary.confirmed} confirmed · ${summary.rejected} rejected · ${summary.skipped} skipped`
  );
  printSeparator();
  console.log("");
  console.log(`  Resolutions saved to ${resolutionsPath}`);
  console.log("");
  console.log("  Next step: run `npm run dedupe:apply` to apply resolutions and output cleaned CSVs.");
  console.log("");
}

/** Check if a hash has a non-skipped resolution */
function isResolved(hash: string, resolutions: Resolution[]): boolean {
  return resolutions.some((r) => r.hash === hash && r.action !== "skipped");
}

/** Deduplicated resolution count (last entry per hash) */
function dedupedResolutionCount(resolutions: Resolution[]): number {
  const seen = new Set<string>();
  for (let i = resolutions.length - 1; i >= 0; i--) {
    seen.add(resolutions[i].hash);
  }
  return seen.size;
}

/** Upsert a resolution: update existing entry for the same hash, or append */
function upsertResolution(resolutions: Resolution[], entry: Resolution): void {
  const existingIdx = resolutions.findIndex((r) => r.hash === entry.hash);
  if (existingIdx !== -1) {
    resolutions[existingIdx] = entry;
  } else {
    resolutions.push(entry);
  }
}

/** Remove ALL resolution entries for a given hash */
function removeAllResolutionsForHash(resolutions: Resolution[], hash: string): void {
  for (let i = resolutions.length - 1; i >= 0; i--) {
    if (resolutions[i].hash === hash) {
      resolutions.splice(i, 1);
    }
  }
}

/** Count deduplicated resolutions */
function resolutionSummary(resolutions: Resolution[]): {
  confirmed: number;
  rejected: number;
  skipped: number;
} {
  const lastByHash = new Map<string, Resolution>();
  resolutions.forEach((r) => lastByHash.set(r.hash, r));
  const unique = [...lastByHash.values()];
  return {
    confirmed: unique.filter((r) => r.action === "confirmed").length,
    rejected: unique.filter((r) => r.action === "rejected").length,
    skipped: unique.filter((r) => r.action === "skipped").length,
  };
}

review().catch((err) => {
  console.error("Error during review:", err);
  process.exit(1);
});
