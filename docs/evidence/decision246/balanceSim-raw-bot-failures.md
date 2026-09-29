# balanceSim: raw (eager-oracle) reference bots under Combat Tension v1 — before harness update

Failures reported by the unchanged balanceSim.test.ts (bots use the oracle every round) on the pilot data:

```
```

Attribution: oracle 3 + enemies E0 → 0 failures; oracle 7 + enemies E1 → 0 failures; only the combination fails. With the saver rule (use only when remaining ≥ rounds left or dangerous) all 11 balanceSim tests pass with unchanged thresholds.
