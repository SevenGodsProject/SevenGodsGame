#!/usr/bin/env bash
# 決定264 Fast Gate の残り（build 済み preview :4301 Before／:4302 After に対して直列に実行）
cd /c/Users/kimi1/SevenGodsGame/.claude/worktrees/agent-a2b3ab0df4dba6c75
E=docs/evidence/decision264
mkdir -p $E/g6-reaction $E/g10-lock $E/g10-godstrike-lock
echo "== gate-hud $(date -Iseconds)"
node scripts/d264-duel-hud/gate-hud.mjs > $E/gate-hud.stdout.txt 2>&1; echo "gate-hud rc=$?"
echo "== gate249 $(date -Iseconds)"
bash scripts/d264-duel-hud/lockrun.sh gate249 node scripts/d264-duel-hud/gate249.mjs $E/g6-reaction > $E/g6-reaction/gate249.log.txt 2>&1; echo "gate249 rc=$?"
echo "== gate-lock $(date -Iseconds)"
D254_OUT=$E/g10-lock D254_BASES=http://127.0.0.1:4301,http://127.0.0.1:4302 bash scripts/d264-duel-hud/lockrun.sh gatelock node scripts/d264-duel-hud/gate-lock.mjs > $E/g10-lock/gate-lock.log.txt 2>&1; echo "gate-lock rc=$?"
for i in 1 2 3 4 5; do
  echo "== gate250 run$i $(date -Iseconds)"
  bash scripts/d264-duel-hud/lockrun.sh gate250 node scripts/d264-duel-hud/gate250.mjs $E/g10-godstrike-lock/run$i noshot > $E/g10-godstrike-lock/run$i.log.txt 2>&1; echo "gate250 run$i rc=$?"
done
echo "== gate252 $(date -Iseconds)"
node scripts/d264-duel-hud/gate252.mjs runs=5 > $E/g10-enemy-ultimate.stdout.txt 2>&1; echo "gate252 rc=$?"
echo "== ALL DONE $(date -Iseconds)"
