# 決定263 候補「Threat Shape v1」— レイアウト非依存部分の準備（PARALLEL PREP・UI 未実装）

- 日付：2026-10-03
- 判断主体：準備の範囲は **CEO 指示**（Lane B「Duel HUD v3」の後に本実装。許可＝純関数／vitest／予告一致確認／段階 glyph 対応表／DOM 仕様／docs・evidence。禁止＝UI 本実装・Lane B と同じ CSS/TSX の同時編集・ブラウザ／build／simulation／重量テストの並列）
- 状態：**PREP DONE（UI なし）**。branch `feat/d263-threat-shape-prep`（master `a3ffa87` 起点・worktree `SevenGodsGame-d263`）。push・merge なし
- Preflight：`docs/OPENING_HAND_READ_PREFLIGHT.md`（GO WITH MODIFICATIONS・決定4 境界は CEO 承認待ち）

---

## 1. 追加したもの（`src/core`・読み取り専用）

| ファイル | 内容 |
|---|---|
| `src/core/engine/previewEnemyActions.ts` | **純関数** `previewEnemyActions(state, rounds = RULES.totalRounds)`：各 R について `nextEnemyAction({ ...state, round })` を呼び、`{ round, kind, total, label, special }` を返す。難易度倍率・Daily 修正子・神階（ATK／後半激化／必殺倍率）の適用と丸めは engine と同じ 1 か所。state を変えない。デバフは含まない（`enemyActionTotal` の定義どおり） |
| `src/core/engine/round.ts` | `nextEnemyAction` に `export` を付けただけ（挙動不変・1 行） |
| `src/core/engine/previewEnemyActions.test.ts` | 4 件：**7 敵 × 難易度 3 × 神階 8（0／Ⅰ／Ⅲ／Ⅴ／Ⅵ／Ⅶ×3 択）＋ Daily 修正子（通常面）＝224 セル × 7 R＝1,568 行**で、engine が実際に出す `ENEMY_INTENT_SET`（合計・kind・技名）と**完全一致**／純関数性（state 不変・再呼び出し同一）／必殺フラグ（special・技名つき連撃のみ）と溜め（total 0・label あり）／7 敵すべてに大技（しきい値以上）が 1 回以上 |

- ルール・乱数・save・replay・gameVersion：変更 0。カード数値／AP／敵 HP／ダメージ／神託回数：変更 0
- vitest（単一ファイル・Lane B のブラウザ Gate と非同時）：**4/4 PASS**【実測 2026-10-03】

## 2. 段階 glyph 対応表（UI 側・`cardStyle.ts` の既存 tier をそのまま使う）

| 事実（`EnemyActionPreview`） | 段階 | glyph（既存 `formatEnemyIntentText` と同じ記号） | 帯のテキスト |
|---|---|---|---|
| `kind: 'charge'` | 溜め | ⚡ | 無し（title 属性に label） |
| `special === true` | 必殺 | 🔥 | 技名 1 語（断岩／怨嗟の花／主砲／狂宴／大海嘯／双牙乱撃＝既存 label の末尾語） |
| `total ≥ 15`（`getIntentPowerTier` = huge） | 特大 | 🔥 | 無し |
| `total ≥ 10`（strong） | 強打 | 💥 | 無し |
| それ以外（normal）・`multiAttack` は合計で判定 | 小 | ⚔ | 無し |

- **数値は出さない**（数値は従来どおり今 R の予告のみ・決定4）。「託宣を先に切れ」等のヒントは帯に書かない（型説明の既存文のまま）
- 段階判定は `getIntentPowerTier(total)`（しきい値 10／15・内部値）を流用＝今 R の予告 glyph と同じ基準 → Gate G2「帯の glyph ＝ その R になったときの予告 glyph」が自動的に成立

## 3. DOM 仕様（本実装時・Duel HUD v3 の敵側 HP 長ゲージ直下）

```
<ol class="threat-shape" aria-label="敵の行動の形（7 ラウンド）">
  <li class="threat-shape-r is-past"   data-round="1" data-tier="normal">⚔</li>
  <li class="threat-shape-r is-current" data-round="2" data-tier="charge" title="砲身に魔力を溜めている…">⚡</li>
  <li class="threat-shape-r"           data-round="3" data-tier="strong">💥</li>
  <li class="threat-shape-r"           data-round="4" data-tier="charge">⚡</li>
  <li class="threat-shape-r is-special" data-round="5" data-tier="special">🔥<span class="threat-shape-name">主砲</span></li>
  <li class="threat-shape-r"           data-round="6" data-tier="normal">⚔</li>
  <li class="threat-shape-r"           data-round="7" data-tier="normal">⚔</li>
</ol>
```

- 配置：決定264（Duel HUD v3）の敵名札（左・HP 長ゲージ）の直下 1 行。幅＝HP ゲージと同じ。高さ ≤18px（SP）／≤20px（PC）。枠・背景なし（K34 Character Integration と整合）
- 状態：`is-past`（減光）／`is-current`（今 R の予告と同じ色）／`is-special`（技名を添える）。reduce media では静止
- 禁止語：帯の DOM テキストは glyph と技名のみ（Gate G6）。`aria-label` も事実のみ
- 入力：`previewEnemyActions(state)` を `EnemyPanel` で `useMemo`（state.enemy.defId・difficulty・stake・stakeChoice・modifier が変わらない限り再計算しない）

## 4. 本実装時の Gate（Preflight §3-3 のとおり）
G1 一致（本書 §1 で先取り PASS）／G2 帯 glyph＝実 R の予告 glyph（Playwright・7 敵 × PC／SP・全 R）／G3 tsc・oxlint・vitest 全件／G4 決定240 A1 と決定264 の HUD 箱（帯は名札の外）／G5 決定250／252／254 の timing lock・入力貫通 0・横スクロール 0・console 0／G6 文言 0

## 5. 実行ログ
- `npx vitest run src/core/engine/previewEnemyActions.test.ts` → 4 passed（browser.lock 無しを確認してから実行・Lane B と非同時）
- ブラウザ／build／simulation：実行 0
