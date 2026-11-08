#!/usr/bin/env bash
set -euo pipefail

project="cinerelay"
tag="v0.2.9"
asset=""
if [[ "${RUN_KIND:-}" == "workflow_dispatch" ]]; then
  project="${PROJECT_ID:?project id required}"
  tag="${RELEASE_TAG:?release tag required}"
  asset="${APK_ASSET:-}"
fi

sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
test -n "$sdk_root"
tools_dir=""
while IFS= read -r candidate; do
  if [[ -x "$candidate/apksigner" && -x "$candidate/aapt" ]]; then tools_dir="$candidate"; fi
done < <(find "$sdk_root/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V)
test -n "$tools_dir"

args=(--project "$project" --tag "$tag" --apksigner "$tools_dir/apksigner"
      --aapt "$tools_dir/aapt"
      --out site/reports/emulator/smoke-report.json
      --screenshot site/reports/emulator/first-launch.png)
if [[ -n "$asset" ]]; then args+=(--asset "$asset"); fi
python3 site/tools/emulator_smoke.py "${args[@]}"
