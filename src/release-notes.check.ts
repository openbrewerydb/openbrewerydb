import assert from "node:assert/strict";
import { diff, render } from "./release-notes.ts";

const row = (id: string, state: string, name = id) => ({ id, name, state_province: state, country: "United States" });
const fields = ["id", "name", "state_province", "country"];

const prev = { fields, rows: [row("a", "Ohio"), row("b", "Ohio"), row("c", "Texas"), row("d", "Iowa")] };
const cur = {
  fields: [...fields.filter((f) => f !== "name"), "name", "phone"],
  rows: [row("a", "Ohio"), row("b", "Ohio", "B2"), row("d", "Utah"), row("e", "Texas")],
};

const d = diff(prev, cur);
assert.deepEqual([d.added, d.removed, d.changed], [1, 1, 2]);
assert.deepEqual(Object.fromEntries(d.regions), {
  "United States / Iowa": { added: 0, removed: 1, changed: 0 },
  "United States / Ohio": { added: 0, removed: 0, changed: 1 },
  "United States / Texas": { added: 1, removed: 1, changed: 0 },
  "United States / Utah": { added: 1, removed: 0, changed: 0 },
});
assert.deepEqual([d.addedColumns, d.removedColumns], [["phone"], []]);

const notes = render(cur, { tag: "v2026.01.01", table: prev });
assert.match(notes, /Schema change/);
assert.doesNotMatch(notes, /B2/, "notes must not contain brewery names");
assert.match(render(prev), /^Initial release: \*\*4\*\*/);

console.log("release-notes check passed");
