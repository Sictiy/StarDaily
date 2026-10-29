#!/bin/sh
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_DIR"
# Cron runs this hourly; the Shanghai clock determines the one eligible run.
[ "$(TZ=Asia/Shanghai date +%H)" = 08 ] || exit 0
exec /usr/bin/python3 collect.py
