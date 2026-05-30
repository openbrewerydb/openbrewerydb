import * as readline from "readline";
import { join } from "path";
import {
  DedupCandidate,
  Resolution,
  loadCandidates,
  saveCandidates,
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

function showCandidate(c: DedupCandidate, total: number, resolutions: Resolution[]) {
  const existing = resolutions.find((r) => r.index === c.index);
  const status = existing
    ? existing.action === "confirmed"
      ? "✅ CONFIRMED"
      : existing.action === "rejected"
        ? "❌ REJECTED"
        : "⏭ SKIPPED"
    : "⬜ PENDING";

  console.log("");
  printSeparator();
  console.log(
    `  Pair ${c.index + 1}/${total}  ·  Similarity: ${(c.similarity * 100).toFixed(1)}%  ·  ${confidenceBadge(c.confidence)}  ·  ${status}`
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
    const r = resolutions.find((res) => res.index === c.index);
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

  // Skip already-resolved pairs
  while (
    currentIdx < candidates.length &&
    resolutions.some((r) => r.index === candidates[currentIdx].index && r.action !== "skipped")
  ) {
    currentIdx++;
  }

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║              🍺  Brewery Dedup Review Tool                       ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  ${candidates.length} duplicate candidate pairs found.`);
  console.log(`  ${resolutions.filter((r) => r.action === "confirmed").length} already confirmed.`);
  console.log("");
  console.log("  Commands: [y] confirm · [n] reject · [s] skip · [a] auto-approve · [b] back");
  console.log("            [l] list · [j #] jump · [r] reset · [h] help · [q] quit");

  while (currentIdx < candidates.length) {
    const candidate = candidates[currentIdx];
    showCandidate(candidate, candidates.length, resolutions);

    const input = await ask(
      rl,
      `  Action [y/n/s/a/b/l/h/q] (${currentIdx + 1}/${candidates.length}): `
    );

    if (input === "y" || input === "") {
      // confirm
      resolutions.push({
        index: candidate.index,
        removeId: candidate.remove.id || candidate.remove.name,
        keepId: candidate.keep.id || candidate.keep.name,
        action: "confirmed",
        resolvedAt: new Date().toISOString(),
      });
      currentIdx++;
    } else if (input === "n") {
      // reject
      resolutions.push({
        index: candidate.index,
        removeId: null,
        keepId: candidate.keep.id || candidate.keep.name,
        action: "rejected",
        resolvedAt: new Date().toISOString(),
      });
      currentIdx++;
    } else if (input === "s") {
      // skip
      resolutions.push({
        index: candidate.index,
        removeId: null,
        keepId: candidate.keep.id || candidate.keep.name,
        action: "skipped",
        resolvedAt: new Date().toISOString(),
      });
      currentIdx++;
    } else if (input === "a") {
      // Auto-approve all remaining high-confidence
      const highConfTotal = candidates
        .slice(currentIdx)
        .filter((c) => c.confidence === "high" && !resolutions.some((r) => r.index === c.index))
        .length;
      const confirmAll = await ask(
        rl,
        `  Auto-approve ${highConfTotal} HIGH-confidence pairs? [y/n]: `
      );
      if (confirmAll === "y" || confirmAll === "") {
        for (let i = currentIdx; i < candidates.length; i++) {
          const c = candidates[i];
          const existing = resolutions.find((r) => r.index === c.index);
          if (existing) continue;
          if (c.confidence === "high") {
            resolutions.push({
              index: c.index,
              removeId: c.remove.id || c.remove.name,
              keepId: c.keep.id || c.keep.name,
              action: "confirmed",
              resolvedAt: new Date().toISOString(),
            });
          } else {
            resolutions.push({
              index: c.index,
              removeId: null,
              keepId: c.keep.id || c.keep.name,
              action: "skipped",
              resolvedAt: new Date().toISOString(),
            });
          }
        }
        currentIdx = candidates.length;
        console.log(`  ✅ Auto-approved ${highConfTotal} high-confidence pairs, skipped the rest.`);
      }
    } else if (input === "b") {
      if (currentIdx > 0) {
        currentIdx--;
        // Remove resolution for pair we're going back to
        const prevCandidate = candidates[currentIdx];
        const ri = resolutions.findIndex((r) => r.index === prevCandidate.index);
        if (ri !== -1) resolutions.splice(ri, 1);
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
    while (
      currentIdx < candidates.length &&
      resolutions.some(
        (r) => r.index === candidates[currentIdx].index && r.action !== "skipped"
      )
    ) {
      currentIdx++;
    }
  }

  rl.close();

  // Save progress
  saveResolutions(resolutions, resolutionsPath);

  const confirmed = resolutions.filter((r) => r.action === "confirmed").length;
  const rejected = resolutions.filter((r) => r.action === "rejected").length;
  const skipped = resolutions.filter((r) => r.action === "skipped").length;

  console.log("");
  showSummary(candidates, resolutions);
  console.log("");
  console.log(`  Resolutions saved to ${resolutionsPath}`);
  console.log("");
  console.log("  Next step: run `npm run dedupe:apply` to apply resolutions and output cleaned CSVs.");
  console.log("");
}

review().catch((err) => {
  console.error("Error during review:", err);
  process.exit(1);
});
