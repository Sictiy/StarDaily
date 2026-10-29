#!/bin/sh
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
case "$PROJECT_DIR" in *"'"*|*'
'*) echo '项目路径不能包含单引号或换行符' >&2; exit 1;; esac
mkdir -p "$PROJECT_DIR/data"
CODEX_PATH=$(command -v codex) || { echo '找不到 codex，请先安装并登录' >&2; exit 1; }
case "$CODEX_PATH" in *"'"*) echo 'Codex 路径不能包含单引号' >&2; exit 1;; esac
TMP_CRON=$(mktemp)
trap 'rm -f "$TMP_CRON"' EXIT HUP INT TERM
crontab -l 2>/dev/null | sed '/# star-daily-collector$/d' > "$TMP_CRON" || true
printf '%s\n' "0 * * * * CODEX_BIN='$CODEX_PATH' '$PROJECT_DIR/scripts/run-scheduled.sh' >> '$PROJECT_DIR/data/collect.log' 2>&1 # star-daily-collector" >> "$TMP_CRON"
crontab "$TMP_CRON"
echo '已安装每天北京时间 08:00 的采集任务。'
