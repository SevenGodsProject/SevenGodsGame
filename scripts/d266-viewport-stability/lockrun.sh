#!/usr/bin/env bash
# 決定266（決定264 の写し）：重い処理（build／vitest 全体）を browser.lock の下で直列に走らせる。他 lane の lock があれば 60 秒ごとに待つ（最大 30 分）
# usage: bash scripts/d266-viewport-stability/lockrun.sh <label> <command...>
LOCKDIR=/c/Users/kimi1/AppData/Local/Temp/sevengods-locks
LOCK=$LOCKDIR/browser.lock
mkdir -p "$LOCKDIR"
label="$1"; shift
for i in $(seq 1 30); do
  if [ -f "$LOCK" ] && ! grep -q '^d266' "$LOCK"; then echo "foreign lock: $(cat "$LOCK") -> wait 60s"; sleep 60; else break; fi
done
echo "d266 $label pid=$$ $(date -Iseconds)" > "$LOCK"
"$@"
rc=$?
rm -f "$LOCK"
exit $rc
