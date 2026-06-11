import { describe, it, expect } from "vitest";
import {
  normalizeValue,
  diffSnapshots,
  type BreweryRecord,
} from "./generate-changelog";

const makeRecord = (overrides: Partial<BreweryRecord> = {}): BreweryRecord => ({
  id: "abc-123",
  name: "Test Brewery",
  brewery_type: "micro",
  address_1: "123 Main St",
  address_2: null,
  address_3: null,
  city: "Portland",
  state_province: "Oregon",
  postal_code: "97201",
  country: "United States",
  phone: "5035551234",
  website_url: "https://test.com",
  longitude: "-122.6789",
  latitude: "45.5231",
  ...overrides,
});

describe("normalizeValue", () => {
  it("returns null for null", () => expect(normalizeValue(null)).toBeNull());
  it("returns null for undefined", () => expect(normalizeValue(undefined)).toBeNull());
  it("returns null for empty string", () => expect(normalizeValue("")).toBeNull());
  it("trims whitespace", () => expect(normalizeValue("  hello  ")).toBe("hello"));
  it("coerces numbers to string", () => expect(normalizeValue(42)).toBe("42"));
  it("preserves non-empty string", () => expect(normalizeValue("Portland")).toBe("Portland"));
});

describe("diffSnapshots", () => {
  const HASH = "abc1234abcd5678";
  const DATE = "2024-01-15";

  it("emits added row for every new UUID", () => {
    const prev = new Map<string, BreweryRecord>();
    const curr = new Map([["abc-123", makeRecord()]]);

    const rows = diffSnapshots(HASH, DATE, prev, curr);

    expect(rows).toHaveLength(1);
    expect(rows[0].change_type).toBe("added");
    expect(rows[0].changed_fields).toBe("");
    expect(rows[0].commit_hash).toBe("abc1234");
    expect(rows[0].commit_date).toBe(DATE);
    expect(rows[0]["id"]).toBe("abc-123");
    expect(rows[0]["name"]).toBe("Test Brewery");
  });

  it("emits deleted row when UUID disappears", () => {
    const prev = new Map([["abc-123", makeRecord()]]);
    const curr = new Map<string, BreweryRecord>();

    const rows = diffSnapshots(HASH, DATE, prev, curr);

    expect(rows).toHaveLength(1);
    expect(rows[0].change_type).toBe("deleted");
    expect(rows[0]["id"]).toBe("abc-123");
    expect(rows[0]["name"]).toBe("Test Brewery");
    expect(rows[0]["address_1"]).toBe("123 Main St");
  });

  it("emits modified row with correct changed_fields", () => {
    const prev = new Map([["abc-123", makeRecord({ address_1: "123 Main St" })]]);
    const curr = new Map([["abc-123", makeRecord({ address_1: "456 Oak Ave" })]]);

    const rows = diffSnapshots(HASH, DATE, prev, curr);

    expect(rows).toHaveLength(1);
    expect(rows[0].change_type).toBe("modified");
    expect(rows[0].changed_fields).toBe("address_1");
    expect(rows[0]["address_1"]).toBe("456 Oak Ave");
  });

  it("lists multiple changed fields pipe-separated", () => {
    const prev = new Map([["abc-123", makeRecord({ phone: "5035551234", website_url: "https://old.com" })]]);
    const curr = new Map([["abc-123", makeRecord({ phone: "5039998888", website_url: "https://new.com" })]]);

    const rows = diffSnapshots(HASH, DATE, prev, curr);

    expect(rows).toHaveLength(1);
    expect(rows[0].changed_fields.split("|")).toContain("phone");
    expect(rows[0].changed_fields.split("|")).toContain("website_url");
  });

  it("emits nothing when values are identical", () => {
    const record = makeRecord();
    const prev = new Map([["abc-123", record]]);
    const curr = new Map([["abc-123", { ...record }]]);

    const rows = diffSnapshots(HASH, DATE, prev, curr);

    expect(rows).toHaveLength(0);
  });

  it("treats null and empty string as equal (no-op)", () => {
    const prev = new Map([["abc-123", makeRecord({ address_2: null })]]);
    const curr = new Map([["abc-123", makeRecord({ address_2: "" })]]);

    const rows = diffSnapshots(HASH, DATE, prev, curr);

    expect(rows).toHaveLength(0);
  });

  it("handles UUID moving between files in same commit (net no-op)", () => {
    const record = makeRecord();
    const prev = new Map([["abc-123", record]]);
    const curr = new Map([["abc-123", { ...record }]]);

    const rows = diffSnapshots(HASH, DATE, prev, curr);

    expect(rows).toHaveLength(0);
  });

  it("handles multiple breweries with independent changes", () => {
    const prev = new Map<string, BreweryRecord>([
      ["id-1", makeRecord({ id: "id-1", name: "Brewery A", brewery_type: "micro" })],
      ["id-2", makeRecord({ id: "id-2", name: "Brewery B" })],
    ]);
    const curr = new Map<string, BreweryRecord>([
      ["id-1", makeRecord({ id: "id-1", name: "Brewery A", brewery_type: "large" })],
      ["id-2", makeRecord({ id: "id-2", name: "Brewery B" })],
      ["id-3", makeRecord({ id: "id-3", name: "Brewery C" })],
    ]);

    const rows = diffSnapshots(HASH, DATE, prev, curr);

    expect(rows).toHaveLength(2);
    const modified = rows.find((r) => r.change_type === "modified");
    const added = rows.find((r) => r.change_type === "added");
    expect(modified?.changed_fields).toBe("brewery_type");
    expect(added?.["id"]).toBe("id-3");
  });

  it("truncates commit hash to 7 chars", () => {
    const prev = new Map<string, BreweryRecord>();
    const curr = new Map([["abc-123", makeRecord()]]);

    const rows = diffSnapshots("abcdef1234567890", DATE, prev, curr);

    expect(rows[0].commit_hash).toBe("abcdef1");
  });
});
