#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_env_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    return
  fi

  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.local"

cd "$ROOT_DIR"
exec "$@"
