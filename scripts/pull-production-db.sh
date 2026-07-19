#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

TIKEP_PROD_SSH_USER="${TIKEP_PROD_SSH_USER:-root}"
TIKEP_PROD_SSH_HOST="${TIKEP_PROD_SSH_HOST:?TIKEP_PROD_SSH_HOST wajib diisi di .env}"
TIKEP_PROD_SSH_PORT="${TIKEP_PROD_SSH_PORT:-22}"
TIKEP_PROD_APP_DIR="${TIKEP_PROD_APP_DIR:?TIKEP_PROD_APP_DIR wajib diisi di .env}"

tmp_dir="$(mktemp -d)"
timestamp="$(date +%Y%m%d%H%M%S)"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

get_local_db_path() {
  node <<'NODE'
const path = require("node:path");
require("dotenv").config({ path: ".env", quiet: true });
const url = process.env.DATABASE_URL || "file:./dev.db";
if (!url.startsWith("file:")) {
  throw new Error("Script ini hanya mendukung SQLite DATABASE_URL file: untuk local.");
}
const rawPath = url.slice("file:".length);
console.log(path.resolve(rawPath));
NODE
}

remote_db_path="$(
  ssh -p "$TIKEP_PROD_SSH_PORT" "$TIKEP_PROD_SSH_USER@$TIKEP_PROD_SSH_HOST" \
    "cd '$TIKEP_PROD_APP_DIR' && node <<'NODE'
const path = require('node:path');
require('dotenv').config({ path: '.env', quiet: true });
const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('file:')) {
  throw new Error('Production DATABASE_URL harus SQLite file: untuk script pull ini.');
}
const rawPath = url.slice('file:'.length);
console.log(path.resolve(rawPath));
NODE"
)"

local_db_path="$(get_local_db_path)"
mkdir -p "$(dirname "$local_db_path")"

if [ -f "$local_db_path" ]; then
  cp -p "$local_db_path" "$local_db_path.backup.$timestamp"
fi

scp -P "$TIKEP_PROD_SSH_PORT" \
  "$TIKEP_PROD_SSH_USER@$TIKEP_PROD_SSH_HOST:$remote_db_path" \
  "$tmp_dir/production.db" >/dev/null

cp "$tmp_dir/production.db" "$local_db_path"
chmod 600 "$local_db_path"

LOCAL_DB_PATH="$local_db_path" node <<'NODE'
const Database = require("better-sqlite3");
const db = new Database(process.env.LOCAL_DB_PATH, { readonly: true });
const count = (table) => db.prepare(`select count(*) as count from ${table}`).get().count;
const latest = db
  .prepare(`
    select u.telegramId, u.username, s.authDate, s.expiresAt
    from TelegramSession s
    join User u on u.id = s.userId
    order by s.createdAt desc
    limit 1
  `)
  .get();

console.log(
  JSON.stringify(
    {
      importedDatabase: process.env.LOCAL_DB_PATH,
      users: count("User"),
      telegramSessions: count("TelegramSession"),
      latestTelegramSession: latest ?? null,
    },
    null,
    2,
  ),
);
NODE
