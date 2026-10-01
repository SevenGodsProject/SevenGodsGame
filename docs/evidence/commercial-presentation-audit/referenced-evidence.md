# 参照した既存 evidence（新規撮影 0・画像生成 0）

本監査は新しいスクリーンショット・画像・音声を一切作っていない。以下は Read で閲覧した既存ファイル（repo 内は worktree パス、repo 外は main worktree の scratch 出力）。

## 閲覧した画像（目視判定の根拠）

| パス | 用途 | 目視で確認したこと |
|---|---|---|
| `docs/evidence/decision254/pilot/pc1508-battle-ready.jpg` | PC 1508×660 戦闘開始直後（決定254 後） | 名札＝漆黒＋金で統一／龍神は決定247 で神の方を向く／敵は low-key で舞台に沈む・神（Kit セル）は明るい／接地影 0・OTOMO（熊）は右端で浮遊／神力 pill 上部バー／水しぶき（原画）と舞台の海が二重 |
| `docs/evidence/decision254/pilot/sp844-battle-ready.jpg` | SP 390×844 同上 | HUD 下端（y≈190）〜敵の絵（y≈400）の間に ≈200px の帯（吹き出し 1 個だけ）／3 列 HUD は成立／敵と神は向き合う／OTOMO は右下に小さく浮遊 |
| `docs/evidence/decision254/pilot/pc1508-entrance-1300ms.jpg` | PC 入口 Full の 1,300ms | 神紋（金の環・刻み）＋大耀 `front_640`＋「大耀 降臨」。右半分は暗転（敵は 1,500 以降）。この 1.1s に SE 無し（sound-timeline §3-1） |
| `docs/evidence/decision252/pilot/presentation/taiyo-ryujin-normal-pc-after.png` | 敗北結果（R4 大海嘯） | 舞台なしの帳票モーダル・pill ボタン 3 個・敗因 1 行。RETURN TO CALM の敗北側が 0 |
| `C:/Users/kimi1/SevenGodsGame/scripts/premium-reaudit/out/pc-07-cutin.png`（repo 外・読むだけ） | 9/27 の静止カットイン | 集中線・帯・円ポートレート（keyvisual）・明朝「神の一撃」。決定250 以降は円の中が動画（大耀のみ）。カットイン全体の構図は不変 |

## 参照した既存 evidence（数値・判定の引用元・閲覧せず docs の記述を引用したもの）

| パス | 引用した内容 |
|---|---|
| `docs/evidence/decision250/pilot-v2/fast-gate/*`・`docs/DECISION250_GOD_STRIKE_PREMIUM_CUTIN_PILOT.md` §8-2／§9 | 動画 T+200 mount・playing 78〜125ms・ended 1,263〜1,276・unlock 900 起点不変・dropped 2/33・配信 227,924B・Human QA 7/7 |
| `docs/evidence/decision254/pilot/tables.md`・`docs/DECISION254_GAME_ENTRY_PILOT.md` §2／§7 | 入口 Full の実測時刻（神紋 385／神 835／敵 1,635／操作可 2,419〜2,434／SE 259〜270・1,506〜1,525）・known #5（JS 予約 ≈230ms 遅れ） |
| `docs/evidence/decision252/pilot/presentation/PRESENTATION_GATE.md` | 決定240 の構え・足元の環 PC 9.36px／SP 15.09px・敵反転・立ち絵 box が Before/After 同一 |
| `docs/evidence/decision249/fast-gate/summary.tsv`・`docs/DECISION249_REACTION_LANGUAGE_V1_PILOT.md` §0／§5 | 7 semantic 60/60・入力ロック中央値 294ms・Human QA 3/3 |
| `docs/ENEMY_ART_DIRECTION_BRIEF_V1.md` §1-1 | 敵 7 体の sharp 実測（trim／edge／tones／high-key／semi-α／whiteEdge） |
| `docs/SOUND_PREMIUM_PRE_AUDIT.md` §0〜§3／§9 | R1〜R6・7/7 の同時層 gain 2.08・ジングル先頭 5s が静か・iOS `volume` |
| `docs/PRACTICAL_QA_2026-09-28_AUDIT.md` §4／§5／§7／§8／§12 | 9/28 の視覚・反応・入口・Voice 監査（比較元） |
| `docs/PREMIUM_REAUDIT_2026-09-27.md` §0／§2／§5 | A〜P 16 層の残 gap（比較元） |
| `docs/H3_GOD_STRIKE_PILOT_PREFLIGHT.md` §0／§13／§14／§19 | コスト WEB確認必要・7 神展開 ≈7.7MB・CEO DECISION の形式 |
| `docs/ASSET_RIGHTS_LEDGER.md` §2-1／§3-C／§3-H／§3-I／§4／§5 | 敵 △・SE ◎・BGM △・CEO INPUT 12 件 |
| `docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md` §2／§5／§6 | 生成 AI 入力 OK・音声は Kit 対象外（:75）・口調設定本文は非配布・非公式設定を公式のように表示する禁止 |

## Lane1 からの前提（本監査は再計算していない）

- God Strike の 1 戦の発動率：通常 ≈55%・hard ≈72%・神階 ≈75〜80%（CEO 指示文に記載された Lane1 実測【docs】）
