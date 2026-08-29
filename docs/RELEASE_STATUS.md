# SEVEN GODS 8/31 Public Beta リリースステータス（2026-08-30 確定）

8/31公開版の「確定状態」を一目で確認するための要約です。新しい仕様判断は含みません（詳細・根拠は`docs/DECISIONS.md` 決定119〜123を参照）。

## Release Summary

| 項目 | 状態 |
|---|---|
| **Release** | SEVEN GODS 8/31 Public Beta |
| **Production Code** | `32697ee` feat: polish enemy select cards |
| **Production URL** | https://seven-gods-game.vercel.app/ |
| **Production QA** | PASS 15/15（2026-08-29、本番URL実測） |
| **Release Verdict** | **GO** |
| **Public Release** | **READY** |
| **Code Freeze** | **ACTIVE**（CEO最終承認 2026-08-30。以降、ゲーム本体・PV・BGMは変更しない） |

## Quality Gate（`32697ee` clean copy）

- typecheck（`npx tsc -b --noEmit`）PASS
- lint（`npx oxlint .`）PASS
- tests **523件** PASS
- production build PASS（本番配信bundle `index-BU0ZotjG.js` と同一ハッシュ）
- normal smoke PASS（7/7）
- Daily smoke PASS（22/22）
- 375px PASS（Home／Enemy Select／Daily 横はみ出しなし）
- console error 0
- HTTP 4xx/5xx 0
- BGM 4 tracks load PASS（home／battle／victory／defeat HEAD 200）

## 機能ステータス

| 機能 | 状態 | 根拠 |
|---|---|---|
| Daily Challenge（今日の神域挑戦） | **READY** | 決定121。JST 0:00切替、週替わりシャッフル、1日3回、★5神域強化（敵HP×1.25／攻撃×1.15）、Seed ID表示、通常戦績と分離、saveVersion 8 |
| Enemy Select Visual Polish | **READY** | 決定123。2層カード、アート161px、hover/focusマーカー、「神に委ねる」ゴールドハロー |
| BURST Preview（共鳴パネル常時表示） | **READY** | 決定122。「あとNで神技発動」＋神の一撃＋OTOMO次形態効果。エンジン変更なし |
| 進行中セーブ破棄前の確認ダイアログ | **READY** | 決定122。通常開始・Daily開始の両方 |
| PV | **VISUAL LOCK / FINAL** | v3 FINAL承認済み（`Videos/SEVENGODS-PV-REVIEW/PV-v3-VISUAL-LOCK.md` にsha256）。変更しない |
| BGM | **license verified / unchanged** | 決定120。Suno有料プラン生成の証跡保存済み。差し替えなし |
| VFX-04 背景ドリフト最適化 | 完了 | 決定119。9.8fps→60.2fps |

## Known Non-blockers（MINOR / Post-release）

いずれも **8/31 blockerではない**。修正は9月以降に判断する。

- **Enemy Select cold load時の一部PNG表示遅延**：PNGのみ配信の3体（藍花の怨霊・蒼海の龍神・乱舞の道化）が初回表示で1秒弱遅れて描画される。本番実測で7体すべて923ms以内に読み込み完了、404なし
- **Dailyの端末時計／localStorage依存**：日付判定・挑戦回数・ベストは端末側で保持（Phase 1仕様、決定121で了承済み）
- **Daily神格差**：balanceSimで全神とも最良戦略の勝率50%以上を確認済みだが、神ごとの差が残る（最低：笑蓮60%）。バランス調整は別トラック
- **701〜899pxのスクロール問題**：PC幅701〜899pxで「ラウンドを終える」まで縦スクロールが必要（決定88で発見、横スクロール・重なりは無し）
- **stale `.claude/worktrees`**：ローカル作業環境のみの残骸。本番・リポジトリ内容に影響なし

## Post-release Priorities（9月以降）

**今回（8/31版）はいずれも実装しない。**

### P1（最優先）
1. BURST任意発動
2. SE実音源
3. Daily共有
4. 戦略深度改善

### P2
- 神域行動
- 神バランス
- Mobile 1画面化
- ボス別ステージ背景

## Excluded Local Files（コミット対象外）

- `.claude/settings.local.json`（ローカル設定。変更があっても含めない）
- 未追跡フォルダ `敵画像`（ローカル素材置き場。含めない）

## 8/31当日の運用メモ（決定88の更新版）

- 本番当日は最初に1回だけ`sevengods.*`のlocalStorageを初期化し、以降は削除しない
- デモ用に進行中バトルを仕込む場合は「続きから」で再開する。8/31版では「神を選ぶ」「今日の神域挑戦」から新規開始しようとすると**確認ダイアログ**が出るため（決定122）、即時消去の事故は起きないが、ダイアログで「破棄」を選ばないこと
- 本番QAではDailyの挑戦回数を消費していない（当日は3回フルに使える）
- BGM／SEの可聴性・ミュート切替はCEO実機確認項目（自動化不可）
