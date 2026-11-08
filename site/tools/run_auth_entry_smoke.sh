#!/usr/bin/env bash
set -euo pipefail
sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
test -n "$sdk_root"
tools_dir=""
while IFS= read -r candidate; do
  if [[ -x "$candidate/apksigner" && -x "$candidate/aapt" ]]; then tools_dir="$candidate"; fi
done < <(find "$sdk_root/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V)
if [[ -z "$tools_dir" ]]; then
  echo "::error::Official Android SDK tools unavailable"
  exit 1
fi
python3 site/tools/auth_entry_smoke.py \
  --project cinerelay --tag v0.2.9 \
  --apksigner "$tools_dir/apksigner" --aapt "$tools_dir/aapt" \
  --output site/reports/auth-entry/auth-entry-result.json
