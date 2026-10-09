# A11y Minimum Pack v1（A11Y-01／02）— 実装・Gate・Human QA

- 日付：2026-10-09（Lane 1・**AI 判断**（CLAUDE.md §6-2）・`docs/ROADMAP_TO_RELEASE.md` §2 #2。CEO 指示 2026-10-09「神 HP のコントラスト／40px 操作ボタンのタップ領域／音量操作のアクセシビリティ／Tutorial の Esc。既存デザインを維持し最小限の修正と自動テスト。独立 worktree で Human QA READY まで自律」）
- 状態：**IMPLEMENTED ON BRANCH `feat/a11y-minimum-pack-v1` — Automated Gate PASS — CEO Human QA READY**（master merge は CEO 承認後・push 0・deploy 0）
- 基準：`docs/A11Y_MINIMUM_STANDARD.md`（S1〜S4）
- 不変：`src/core` 0・save 0・ゲーム規則 0・色（緑 `#4dbd74`／赤 `#e5484d`／金 `#ffd166`）0・ゲージの高さ 18px 0・ドック／アリーナの構図 0

---

## 1. 変更（最小）

| 基準 | 変更 | ファイル |
|---|---|---|
| S1 HP の数字 4.5:1 | 数字を暗い pill（`#05060b` α0.77・角丸・高さ 14px）で包む。白 × 緑 **1.96 → 11.6**、白 × 赤 **3.24 → 13.3**、溝 15 以上。hudPlate の艶は外側に残す | `battle/HpBar.tsx`（`<span class="hp-bar-label-text">`）・`battle/battle.css`（1 ルール） |
| S2 タップ 44px | デッキ stepper の見た目 40→**44**（`flex: 0 0 44px`・gap 10→4 で PC の狭いカードでも縮まない）／最終試練の選択肢 `min-height: 44px`。託宣（判定 45）・ヘッダーアイコン（判定 44）は `::after` の判定を維持し見た目は不変（構図を変えないため） | `setup/setup.css` |
| S3 ミュート | 名前を固定「ミュート」＋`aria-pressed`（従来は名前が切り替わり状態と二重読み上げ）・`title` で補足。ネイティブ button・`focus-visible`（既存）・Space／Enter で切替（既存） | `App.tsx` |
| S4 Tutorial | **Esc で閉じる**（window capture で受けて `stopPropagation`＝Brief から開いたとき Brief を巻き込まない）／開いたらカード本体へフォーカス（`tabIndex=-1`・`preventScroll`＝本文の先頭を保つ）／**Tab／Shift+Tab はダイアログ内で循環**／閉じたら開いた要素へフォーカス復帰／カードのフォーカス枠はキーボード時だけ金 | `TutorialOverlay.tsx`・`tutorial.css` |
| 部品 | `src/components/a11y/contrast.ts`（WCAG コントラスト・純粋関数） | 新規 |
| テスト | `src/components/a11yMinimum.test.ts`（14 件：CSS の値から 4.5 を算出・44px・aria・Esc／trap／復帰の配線）／`scripts/a11y-minimum-pack/acceptance.mjs`（実ブラウザ 23 項目 × 3 viewport） | 新規 |
| docs | `docs/A11Y_MINIMUM_STANDARD.md`（A11Y-02 基準文書）・本書・`docs/evidence/a11y-minimum-pack/`（JSON＋スクリーンショット 6 枚） | 新規 |

## 2. Automated Gate（2026-10-09・worktree `SevenGodsGame-rl01`）

| 項目 | 結果 |
|---|---|
| tsc -b | 0 error |
| oxlint | error 0 |
| vitest（a11yMinimum 14＋関連契約 pressFeel／entranceWiring／godStrikeStage／hudPlate／dockControls） | **PASS**（full は §2-1） |
| build | PASS（CSS 191.27kB・JS 462.46kB：pill 1 ルール＋Tutorial のキーボード処理 ≈ +1kB） |
| Playwright `acceptance.mjs`（PC 1508×660／SP 390×844／SP 375×667・Chromium headless） | **70／70 PASS**。Tutorial：Enter で開く → 初期フォーカス＝カード・scrollTop 0 → Tab／Shift+Tab は内側で循環 → Esc で閉じる → フォーカスは「遊び方を見る」へ復帰／Brief から開いて Esc → Tutorial だけ閉じ Brief は残る／ミュート：名前固定・click と Space で `aria-pressed` 切替・判定 44／stepper 見た目 44×44・横はみ出し 0（375 でも）／HP：神 300/300 `onFill` ≥4.5（従来 1.96）・敵 940/940 ≥4.5（従来 3.24）・溝 ≥4.5／託宣 `::after` 45／戦闘画面の操作要素に「見た目 <44 かつ判定拡張なし」0／JS error 0 |
| 証跡 | `docs/evidence/a11y-minimum-pack/acceptance.json`・`battle-{pc,sp}.png`・`hpbar-{pc,sp}.png`・`deck-{pc,sp}.png` |

### 2-1. full vitest／最終

| full vitest | **1,404 PASS・9 skip・0 fail**（114 files・+14） |

## 3. 設計上の判断（AI）

1. **pill 方式**を選んだ理由：文字色を黒にすると緑 8.8／赤 5.3 は満たすが、HP が減って文字が溝（暗色）の上に来た瞬間に 1.x へ落ちる。pill なら fill の色・残量に依らず一定（11〜15）。見た目の変化は数字の後ろに小さな暗い帯が付くだけで、HUD の艶・金枠・ゲージ高さは不変
2. **託宣・ヘッダーは見た目を広げない**：託宣を 44 にするとドックが伸びてアリーナが縮む（Hygiene §3-2 の実測）。判定は既に 45／44 で基準 S2 を満たす
3. **音量スライダー・BGM／SE 個別 OFF は入れない**：ROADMAP「音量 or 個別 OFF」の「or」は S3（ミュートの操作性）で満たす。個別 OFF は新 UI、音量は iOS 制約で GainNode 経路が要る（P2・`A11Y_MINIMUM_STANDARD.md` §6）
4. **ミュート状態の保存は入れない**：新 storage key は `STORAGE_VERSION_POLICY.md` R7 の手続き（登録・テスト）が要るため別件

## 4. CEO Human QA（1 問）

| # | 問い | NO の場合 |
|---|---|---|
| Q1 | 戦闘中、HP の数字が緑／赤のバーの上で一目で読め、pill が邪魔に見えないか（PC と iPhone） | pill の透明度（α0.77）を 0.6〜0.9 で 1 回だけ再調整し再 QA（基準 4.5 は α0.6 でも満たす：緑 7.2／赤 8.6） |

補足確認（任意）：遊び方を本のアイコンから開いて Esc で閉じる／デッキ編成の ± が押しやすいか。

## 5. 最終 Gate（commit 前・2026-10-09）

| 項目 | 結果 |
|---|---|
| tsc -b | 0 error |
| oxlint | error 0 |
| full vitest | 1,404 PASS・9 skip・0 fail |
| Playwright acceptance | 70／70 PASS（PC／SP／SP375） |
| `src/core` 差分 | 0 行 |
| 変更ファイル | runtime 6（App.tsx・TutorialOverlay.tsx・tutorial.css・HpBar.tsx・battle.css・setup.css）＋部品 1＋テスト 1＋スクリプト 1＋docs 2＋evidence |
