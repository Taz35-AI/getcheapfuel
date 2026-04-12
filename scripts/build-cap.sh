#!/usr/bin/env bash
# Build a static export for Capacitor (Android / iOS).
#
# Usage:  bash scripts/build-cap.sh
#
# What it does:
#   1. Temporarily moves src/app/api out of the build (API routes use
#      dynamic request data and are incompatible with static export).
#   2. Runs `next build` with output:'export', producing the `out/` dir.
#   3. Restores src/app/api.
#   4. Syncs the static bundle into the native projects via `npx cap sync`.

set -euo pipefail

API_DIR="src/app/api"
BACKUP_DIR="src/app/_api_backup"

# Safety: restore API routes on any exit (success or failure)
# Uses cp+rm instead of mv to avoid Windows file-locking issues.
cleanup() {
  if [ -d "$BACKUP_DIR" ]; then
    rm -rf "$API_DIR"
    cp -r "$BACKUP_DIR" "$API_DIR"
    rm -rf "$BACKUP_DIR"
    echo "✓ Restored API routes"
  fi
}
trap cleanup EXIT

echo "→ Moving API routes aside (incompatible with static export)…"
cp -r "$API_DIR" "$BACKUP_DIR"
rm -rf "$API_DIR"

echo "→ Building static export…"
CAPACITOR=1 NEXT_PUBLIC_API_BASE=https://www.getcheapfuel.co.uk npx next build

echo "→ Syncing with native projects…"
npx cap sync

echo ""
echo "✓ Capacitor build complete. Open Android Studio or Xcode to run:"
echo "    npx cap open android"
echo "    npx cap open ios"
