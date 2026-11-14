// Self-check for verification-checklist.ts. Run with: npm run check:verification
import assert from "node:assert/strict";
import {
  diffRows,
  findTickedKeys,
  MAX_ITEMS,
  renderChecklist,
  replaceChecklistInBody,
  requiredTickKeys,
  verificationStatus,
} from "./verification-checklist.ts";

const header = "id,name,brewery_type,city,state_province,phone\r\n";
const baseCsv =
  header +
  "a1,Alpha,micro,Keene,New Hampshire,111\r\n" +
  "b2,Beta,micro,Dover,New Hampshire,222\r\n" +
  "c3,Gamma,micro,Exeter,New Hampshire,333\r\n";
const headCsv =
  header +
  "a1,Alpha,closed,Keene,New Hampshire,999\r\n" + // updated
  "b2,Beta,micro,Dover,New Hampshire,222\r\n" + //   unchanged
  ",New <!-- k:x --> Brew,micro,Lee,New Hampshire,\r\n"; // added, with no id, and a name trying to inject a fake key
//                                                          Gamma is removed

// Detects adds, updates and removes, and sanitizes untrusted names.
const items = diffRows("data/nh.csv", baseCsv, headCsv);
assert.deepEqual(
  items.map((item) => [item.action, item.breweryName, item.changedFields.join()]),
  [
    ["Update", "Alpha", "brewery_type,phone"],
    ["Add", "New !-- k:x -- Brew", ""],
    ["Remove", "Gamma", ""],
  ],
);

// Status is pending until every box, including the attestation, is ticked.
const allKeys = requiredTickKeys(items);
assert.equal(allKeys.size, 4);
assert.equal(verificationStatus(items, new Set()).state, "pending");
const fullyTicked = renderChecklist(items, allKeys);
assert.deepEqual(findTickedKeys(fullyTicked), allKeys);
assert.equal(verificationStatus(items, findTickedKeys(fullyTicked)).state, "success");

// The checklist is appended once, then replaced in place without touching the rest of the description.
const body = replaceChecklistInBody("Contributor's description", fullyTicked);
assert.equal(replaceChecklistInBody(body, fullyTicked), body);
assert.ok(replaceChecklistInBody(body, renderChecklist(items, new Set())).startsWith("Contributor's description"));

// Re-pushing a change to Alpha clears Alpha's tick and the attestation; Add and Remove keep theirs.
const itemsAfterPush = diffRows("data/nh.csv", baseCsv, headCsv.replace("999", "998"));
const ticksStillValid = new Set([...allKeys].filter((key) => requiredTickKeys(itemsAfterPush).has(key)));
assert.equal(verificationStatus(itemsAfterPush, ticksStillValid).description, "2/4 verified");

// PRs over the limit get no checkboxes and a failing status.
const hugeCsv = header + Array.from({ length: MAX_ITEMS + 1 }, (_, n) => `,Brewery ${n},micro,X,Y,\r\n`).join("");
const hugeItems = diffRows("data/x.csv", header, hugeCsv);
assert.equal(verificationStatus(hugeItems, new Set()).state, "failure");
assert.equal(findTickedKeys(renderChecklist(hugeItems, requiredTickKeys(hugeItems))).size, 0);

console.log("verification-checklist: ok");
