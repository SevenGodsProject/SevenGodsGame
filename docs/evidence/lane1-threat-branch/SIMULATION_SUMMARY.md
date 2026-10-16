# Threat Branch Pilot v1 — 決定論シミュレーション結果

生成：2026-10-16T17:17:33.462Z（`SIM_THREAT_BRANCH=1 npx vitest run src/core/engine/threatBranch.sim.test.ts`。この表は `sim.json` から生成）

- 敵：業斧の鬼将・軍略（enemy_09・maxHp 94・しきい値 0.5 → HP 47 以下で then）／比較：業斧の鬼将（enemy_02）
- 7 神 × seed 40 × normal／hard × greedy／raceAware／reader。乱数は seed のみ

## Gate

```json
{
  "G1": {
    "pass": true,
    "value": 0.418,
    "range": [
      0.35,
      0.65
    ],
    "note": "then 率（enemy_09・normal・greedy・全神 pooled）",
    "byPolicy": {
      "greedy": 0.418,
      "raceAware": 0.589,
      "reader": 0.418
    }
  },
  "G2": {
    "pass": true,
    "raceAware": {
      "winRate": 1,
      "meanScore": 630.1
    },
    "greedy": {
      "winRate": 1,
      "meanScore": 627
    },
    "reader": {
      "winRate": 1,
      "meanScore": 628.7
    }
  },
  "G3": {
    "pass": true,
    "enemy09Reader": 1,
    "enemy02Reader": 1,
    "diffPt": 0,
    "hard": {
      "enemy09Reader": 1,
      "enemy02Reader": 0.986
    }
  },
  "G4": {
    "informational": true,
    "eitherFlipRate": 0.219,
    "branchFlipRate": 0.219,
    "statusFlipRate": 0,
    "withChoiceRate": 0.489
  }
}
```

## 全神 pooled（n = 280）

| 敵 | 難易度 | 方策 | 勝率 | 平均スコア | 平均決着R | R4到達 | then率 | HP比@R4 平均 | then@0.45 | then@0.50 | then@0.55 | R4で託宣 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| enemy_02 | normal | greedy | 100.0% | 621.6 | 5.69 | 280/280 | — | 0.542 | 28.9% | 41.8% | 58.6% | 53.2% |
| enemy_02 | normal | raceAware | 100.0% | 624 | 5.67 | 280/280 | — | 0.542 | 28.9% | 41.8% | 58.6% | 98.2% |
| enemy_02 | normal | reader | 100.0% | 624 | 5.67 | 280/280 | — | 0.542 | 28.9% | 41.8% | 58.6% | 98.2% |
| enemy_02 | hard | greedy | 98.6% | 635.6 | 6.11 | 280/280 | — | 0.615 | 6.1% | 17.9% | 32.5% | 81.8% |
| enemy_02 | hard | raceAware | 98.6% | 636.5 | 6.1 | 280/280 | — | 0.615 | 6.1% | 17.9% | 32.5% | 100.0% |
| enemy_02 | hard | reader | 98.6% | 636.5 | 6.1 | 280/280 | — | 0.615 | 6.1% | 17.9% | 32.5% | 100.0% |
| enemy_09 | normal | greedy | 100.0% | 627 | 5.62 | 280/280 | 41.8% | 0.542 | 28.9% | 41.8% | 58.6% | 33.6% |
| enemy_09 | normal | raceAware | 100.0% | 630.1 | 5.6 | 280/280 | 58.9% | 0.542 | 30.4% | 58.9% | 58.9% | 44.6% |
| enemy_09 | normal | reader | 100.0% | 628.7 | 5.6 | 280/280 | 41.8% | 0.542 | 28.9% | 41.8% | 58.6% | 60.0% |
| enemy_09 | hard | greedy | 100.0% | 644 | 6.13 | 280/280 | 17.9% | 0.615 | 6.1% | 17.9% | 32.5% | 72.1% |
| enemy_09 | hard | raceAware | 99.6% | 642.7 | 6.13 | 280/280 | 27.1% | 0.631 | 7.5% | 27.1% | 31.1% | 79.6% |
| enemy_09 | hard | reader | 100.0% | 644.3 | 6.12 | 280/280 | 17.9% | 0.615 | 6.1% | 17.9% | 32.5% | 87.1% |

## 神別（normal）：勝率 / then 率

| 神 | 02 greedy | 02 reader | 09 greedy | 09 raceAware | 09 reader | 09 then(greedy) | 09 then(raceAware) | 09 then(reader) |
|---|---|---|---|---|---|---|---|---|
| ebisu | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 62.5% | 80.0% | 62.5% |
| taiyo | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 37.5% | 47.5% | 37.5% |
| sobi | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 47.5% | 52.5% | 47.5% |
| saika | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 32.5% | 52.5% | 32.5% |
| juraku | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 20.0% | 60.0% | 20.0% |
| fukuei | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 37.5% | 50.0% | 37.5% |
| shouren | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 55.0% | 70.0% | 55.0% |

## 神別（hard）：勝率

| 神 | 02 greedy | 02 reader | 09 greedy | 09 raceAware | 09 reader | 09 then(greedy) |
|---|---|---|---|---|---|---|
| ebisu | 95.0% | 95.0% | 100.0% | 100.0% | 100.0% | 32.5% |
| taiyo | 97.5% | 97.5% | 100.0% | 100.0% | 100.0% | 15.0% |
| sobi | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 22.5% |
| saika | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 20.0% |
| juraku | 100.0% | 100.0% | 100.0% | 97.5% | 100.0% | 2.5% |
| fukuei | 97.5% | 97.5% | 100.0% | 100.0% | 100.0% | 17.5% |
| shouren | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 15.0% |

## G4：R3 の手（攻撃全振り vs 妨害先置き）が結果を変えた割合（enemy_09・R3 以降は greedy・R3 の託宣なし）

```json
{
  "normal": {
    "games": 280,
    "reachedR3": 280,
    "withChoice": 137,
    "withChoiceRate": 0.489,
    "branchFlip": 30,
    "branchFlipRate": 0.219,
    "statusFlip": 0,
    "statusFlipRate": 0,
    "eitherFlip": 30,
    "eitherFlipRate": 0.219,
    "scoreDiffRate": 0.949,
    "perGod": {
      "ebisu": {
        "withChoice": 18,
        "eitherFlip": 2
      },
      "taiyo": {
        "withChoice": 16,
        "eitherFlip": 2
      },
      "sobi": {
        "withChoice": 34,
        "eitherFlip": 14
      },
      "saika": {
        "withChoice": 0,
        "eitherFlip": 0
      },
      "juraku": {
        "withChoice": 36,
        "eitherFlip": 7
      },
      "fukuei": {
        "withChoice": 17,
        "eitherFlip": 1
      },
      "shouren": {
        "withChoice": 16,
        "eitherFlip": 4
      }
    }
  },
  "hard": {
    "games": 280,
    "reachedR3": 280,
    "withChoice": 140,
    "withChoiceRate": 0.5,
    "branchFlip": 15,
    "branchFlipRate": 0.107,
    "statusFlip": 1,
    "statusFlipRate": 0.007,
    "eitherFlip": 16,
    "eitherFlipRate": 0.114,
    "scoreDiffRate": 0.979,
    "perGod": {
      "ebisu": {
        "withChoice": 18,
        "eitherFlip": 1
      },
      "taiyo": {
        "withChoice": 18,
        "eitherFlip": 3
      },
      "sobi": {
        "withChoice": 34,
        "eitherFlip": 6
      },
      "saika": {
        "withChoice": 0,
        "eitherFlip": 0
      },
      "juraku": {
        "withChoice": 36,
        "eitherFlip": 1
      },
      "fukuei": {
        "withChoice": 18,
        "eitherFlip": 3
      },
      "shouren": {
        "withChoice": 16,
        "eitherFlip": 2
      }
    }
  }
}
```
