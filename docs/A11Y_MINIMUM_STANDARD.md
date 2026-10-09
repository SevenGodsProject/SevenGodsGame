# A11y Minimum Standard（A11Y-02 基準文書）— v1.0 で守る最低線

- 日付：2026-10-09（Lane 1・**AI 判断**（CLAUDE.md §6-2）・`docs/ROADMAP_TO_RELEASE.md` §2 #2 の「a11y 基準文書 1 本」。CEO 指示 2026-10-09「既存デザインを維持し、最小限の修正と自動テスト」）
- 範囲：ブラウザで遊ぶ SEVEN GODS の **操作できる UI** と **読むべき数字**。装飾・演出（VFX・カットイン）は対象外（`prefers-reduced-motion` は既存どおり）
- 判定の原則：**機械で測れるものは機械で固定する**（vitest のソース契約＋Playwright 実測）。人の確認は 1 問だけ（§4）

---

## 1. 基準（WCAG 2.2 の AA を最低線に、ゲーム UI に合わせて 4 項目に絞る）

| # | 基準 | しきい値 | 根拠 | 測り方 |
|---|---|---|---|---|
| S1 | **読むべき数字のコントラスト**（神 HP・敵 HP の数値） | **4.5:1 以上**（通常文字 11〜14px） | WCAG 1.4.3 | 文字色 × 実効背景（半透明の pill を fill に合成）を `src/components/a11y/contrast.ts` で算出。vitest が CSS の値から固定し、Playwright が computed style から再計算 |
| S2 | **タップ領域** | **44×44 CSS px 以上**（見た目、または `::after` の absolute 拡張を含む判定） | WCAG 2.5.5（AAA）＝Apple HIG 44pt。2.5.8（AA）の 24px は小さすぎるため採らない | Playwright：戦闘画面の `button／a／role=button／radio` を全数検査（見た目 <44 かつ `::after` 拡張なし＝FAIL）。`release-hygiene/cls.mjs` の既存監査と同じ判定 |
| S3 | **音のオン／オフが補助技術とキーボードで操作できる** | ネイティブ `button`・名前が固定・状態は `aria-pressed`・`focus-visible` が見える・Space/Enter で切替 | WCAG 4.1.2／2.1.1／2.4.7 | Playwright：name・aria-pressed・Space 切替・`::after` 44px |
| S4 | **モーダルのキーボード操作**（遊び方） | Esc で閉じる／開いたらダイアログへフォーカス（本文の先頭を保つ）／Tab はダイアログ内で循環／閉じたら開いた要素へ戻る／`role=dialog aria-modal` | WCAG 2.1.2（キーボードトラップなし＝閉じられること）／2.4.3／ARIA APG dialog | Playwright：Enter で開く → activeElement → Tab／Shift+Tab → Esc → フォーカス復帰。Brief から開いたときは Esc で Tutorial だけ閉じる |

## 2. 「見た目」と「判定」の扱い（S2）

- **判定は `::after` の absolute 拡張を含めて 44px**（既存の監査 `cls.mjs` と同じ）。見た目まで 44px に広げるのは、**広げても他の要素と重ならず、画面の構図（ドック／アリーナ比）を変えないもの**に限る
- 今回 見た目も 44 にしたもの：デッキ stepper（40→44。カード幅 151〜179px に対し 126px で収まる）／最終試練の選択肢（`min-height: 44px`）
- 判定だけ 44 のまま残すもの（理由）：託宣 3 枚（見た目 39、判定 45。44 にするとドックが伸びてアリーナが縮む＝Hygiene §3-2 の前例）／ヘッダーのアイコン（34・戦闘中 26、判定 44。ヘッダー高さを変えない）

## 3. 色（S1）

- 文字 `#e8e9f3`（本文色と同じ）。pill `#05060b` α0.77（戦闘 HUD の溝 `#05060b〜#10142a` と同系）。fill の色（緑 `#4dbd74`・赤 `#e5484d`）は変えない
- 実効比：緑 fill 11.6／赤 fill 13.3／溝 15 以上（従来：緑 1.96・赤 3.24）
- ゴールド `#ffd166` はフォーカス枠専用（`press.css`）。`hudPlate.css` には書かない（`hudPlate.test.ts` の禁止事項）

## 4. 人が確認すること（Human QA 1 問）

- 「HP の数字が、緑／赤のバーの上でも一目で読めるか。pill が邪魔に見えないか」（YES／NO）

## 5. 今後 UI を足すときの手順（R7 相当）

1. 操作できる要素は 44px（見た目 or `::after`）で作る。小さくせざるを得ない場合は `::after` で判定を広げ、`press.css` の `focus-visible` 一覧に加える
2. 読むべき数字を色の上に置くときは `labelContrastOnFill` で 4.5 を確かめ、`a11yMinimum.test.ts` に 1 行足す
3. モーダルを足すときは `TutorialOverlay.tsx` の Esc（capture）＋初期フォーカス＋復帰＋trap を踏襲する（`ConfirmDialog`／`FirstBattleBrief` は Esc と autoFocus のみ。trap と復帰は未対応＝P2）
4. `scripts/a11y-minimum-pack/acceptance.mjs` を回す（PC／SP／SP375）

## 6. 対象外（記録のみ・P2）

- BGM／SE の個別 OFF・音量スライダー（ROADMAP「音量 or 個別 OFF」の「or」を S3 で満たす。音量は iOS の制約で GainNode 経路が必要・新 UI）
- ミュート状態の保存（新 storage key＝`STORAGE_VERSION_POLICY.md` R7 の手続きが要る）
- `FeedbackOverlay`／`ConfirmDialog` の focus trap と復帰
- スクリーンリーダーでの戦闘ログ読み上げ（`aria-live`）
- 色覚多様性（赤／緑の HP バー。数字で補っている）
