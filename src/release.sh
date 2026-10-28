#!/usr/bin/env bash
# Release tooling for Open Brewery DB. Forge-agnostic: only needs git, bash,
# node and sha256sum. CI wrappers call these commands and upload dist/*.
set -euo pipefail
cd "$(dirname "$0")/.."

check() {
  npm run validate && npm run csv:combine && npm run csv:split && npm run generate:json
  git diff --exit-code -- breweries.csv breweries.json data/ ||
    { echo "✋ Generated files are stale. Run 'npm run workflow:maintain', commit, and try again." >&2; exit 1; }
}

tag() {
  if [ "${1:-}" = "--dry-run" ]; then DRY=1; else DRY=0; fi
  default_branch="$(git rev-parse --abbrev-ref origin/HEAD | cut -d/ -f2)"
  test -z "$(git status --porcelain)" || { echo "✋ Working tree is not clean." >&2; exit 1; }
  test "$(git branch --show-current)" = "$default_branch" ||
    { echo "✋ Not on default branch '$default_branch'." >&2; exit 1; }
  git fetch origin "$default_branch"
  test "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$default_branch")" ||
    { echo "✋ HEAD differs from origin/$default_branch." >&2; exit 1; }
  check
  tag="v$(date -u +%Y.%m.%d)"
  git rev-parse -q --verify "refs/tags/$tag" >/dev/null &&
    { echo "✋ Tag $tag already exists. Use $tag.1 for a same-day re-release." >&2; exit 1; }
  if [ "$DRY" = 1 ]; then echo "✅ Checks pass. Would create and push tag $tag"; exit 0; fi
  git tag -a "$tag" -m "Release $tag"
  git push origin "$tag"
}

build() {
  ref="$1"
  git rev-parse -q --verify "$ref" >/dev/null || { echo "✋ Unknown ref '$ref'." >&2; exit 1; }
  if name="$(git describe --tags --exact-match "$ref" 2>/dev/null)"; then :; else
    name="$(git rev-parse --short "$ref")"
    echo "ℹ️  $ref is not a tag; using commit sha $name in asset names."
  fi
  rm -rf dist && mkdir dist
  for f in breweries.csv breweries.json breweries.sql; do git show "$ref:$f" > "dist/$f"; done
  git archive --format=zip --prefix="openbrewerydb-$name/" -o "dist/openbrewerydb-$name.zip" \
    "$ref" breweries.csv breweries.json breweries.sql LICENSE
  git archive --format=zip --prefix="openbrewerydb-data-$name/" -o "dist/openbrewerydb-data-$name.zip" \
    "$ref" data LICENSE
  (cd dist && sha256sum * > SHA256SUMS)
  node --experimental-strip-types src/release-notes.ts "$ref" > release-notes.md
  echo "✅ Built dist/ and release-notes.md for $name"
}

case "${1:-}" in
  check) check ;;
  tag) tag "${2:-}" ;;
  build) build "${2:?usage: release.sh build <ref>}" ;;
  *) echo "usage: release.sh {check|tag [--dry-run]|build <ref>}" >&2; exit 1 ;;
esac
