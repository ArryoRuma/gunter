#!/usr/bin/env bash
set -euo pipefail

echo "Checking Copilot organization files..."

required_files=(
  ".github/copilot-instructions.md"
  ".github/AGENTS.md"
  ".github/pull_request_template.md"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file"
    exit 1
  fi
done

echo "Required Copilot files exist."
