#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT/.agent-skills/manifest.json"
CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/narcoguard-agent-skills"
VENDOR_DIR="$ROOT/.agent-skills/vendor"

SOURCE="$(node -e 'const m=require(process.argv[1]); process.stdout.write(m.source)' "$MANIFEST")"
COMMIT="$(node -e 'const m=require(process.argv[1]); process.stdout.write(m.commit)' "$MANIFEST")"

mkdir -p "$(dirname "$CACHE_DIR")"
if [[ ! -d "$CACHE_DIR/.git" ]]; then
  git clone --filter=blob:none "$SOURCE" "$CACHE_DIR"
fi

git -C "$CACHE_DIR" fetch --depth=1 origin "$COMMIT"
git -C "$CACHE_DIR" checkout --detach "$COMMIT"

rm -rf "$VENDOR_DIR.tmp"
mkdir -p "$VENDOR_DIR.tmp"

node - "$MANIFEST" "$CACHE_DIR" "$VENDOR_DIR.tmp" <<'NODE'
const fs = require("fs")
const path = require("path")
const [manifestPath, sourceRoot, targetRoot] = process.argv.slice(2)
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
for (const skill of manifest.skills) {
  const src = path.join(sourceRoot, skill)
  const dst = path.join(targetRoot, skill)
  if (!fs.existsSync(path.join(src, "SKILL.md"))) {
    throw new Error(`Missing SKILL.md for ${skill} at pinned source commit`)
  }
  fs.cpSync(src, dst, { recursive: true })
}
NODE

rm -rf "$VENDOR_DIR"
mv "$VENDOR_DIR.tmp" "$VENDOR_DIR"

for target in "$ROOT/.claude/skills" "$ROOT/.codex/skills"; do
  mkdir -p "$target"
  while IFS= read -r skill; do
    rm -rf "$target/$skill"
    cp -R "$VENDOR_DIR/$skill" "$target/$skill"
  done < <(node -e 'const m=require(process.argv[1]); for (const s of m.skills) console.log(s)' "$MANIFEST")
done

echo "NarcoGuard agent skills installed from coden607/skills@$COMMIT"
