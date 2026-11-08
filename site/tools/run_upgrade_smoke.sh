#!/usr/bin/env bash
set -euo pipefail

sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
test -n "$sdk_root"
tools_dir=""
while IFS= read -r candidate; do
  if [[ -x "$candidate/apksigner" && -x "$candidate/aapt" ]]; then tools_dir="$candidate"; fi
done < <(find "$sdk_root/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V)
if [[ -z "$tools_dir" ]]; then
  echo "::error::Official Android SDK build tools unavailable"
  exit 1
fi

# This repository contains no signing key or trusted signing material.
# The source-declared *public fingerprint* below is from CineRelay's
# apps/android/signing/cinerelay-update-cert.sha256 (as checked 2026-11-08).
project="cinerelay"
old_tag="v0.2.7"
new_tag="v0.2.9"
expected_cert="17728AEDEE7361B8C7126C3317BD396FEE4DDED3AB8790594FDE5BD7E0123617"

if [[ "${RUN_KIND:-}" == "workflow_dispatch" ]]; then
  project="${PROJECT_ID:?catalog id required}"
  old_tag="${PREVIOUS_TAG:?previous release tag required}"
  new_tag="${TARGET_TAG:?target release tag required}"
  expected_cert="${EXPECTED_CERT:-}"
fi

args=(--project "$project" --previous-tag "$old_tag" --target-tag "$new_tag"
      --apksigner "$tools_dir/apksigner" --aapt "$tools_dir/aapt"
      --report site/reports/upgrade/upgrade-result.json
      --screenshot site/reports/upgrade/upgraded-launch.png)
if [[ -n "$expected_cert" ]]; then args+=(--expected-cert "$expected_cert"); fi
python3 site/tools/upgrade_smoke.py "${args[@]}"
