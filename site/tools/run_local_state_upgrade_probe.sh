#!/usr/bin/env bash
set -euo pipefail

sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [[ -z "$sdk_root" || ! -d "$sdk_root/build-tools" ]]; then
  echo "::error::Official Android SDK build-tools directory missing."
  exit 1
fi
tools_dir=""
while IFS= read -r candidate; do
  if [[ -x "$candidate/apksigner" && -x "$candidate/aapt" ]]; then
    tools_dir="$candidate"
  fi
done < <(find "$sdk_root/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V)
if [[ -z "$tools_dir" ]]; then
  echo "::error::Android apksigner and aapt unavailable"
  exit 1
fi

# Strict scope: one disposable rooted emulator, and only the real
# app-owned welcome preference + a synthetic file. No session/account files.
python3 site/tools/local_state_upgrade_probe.py \
  --project cinerelay \
  --previous-tag v0.2.7 \
  --target-tag v0.2.9 \
  --apksigner "$tools_dir/apksigner" \
  --aapt "$tools_dir/aapt" \
  --report site/reports/local-state/state-report.json \
  --screenshot site/reports/local-state/updated-welcome.png
