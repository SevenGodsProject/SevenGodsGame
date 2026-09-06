# Visual Quality Assets — QA レポート

- **Branch**: `feat/visual-quality-assets`
- **日付**: 2026-09-06
- **区分**: 画質改善パッチ（AI判断・CLAUDE.md §6-2）。Phase 3 の仕様・balance・God Identity・card bonus には一切触れていない
- **North Star**: 背景と並べて「キャラクターだけ粗い」と感じない状態にする／同時に通信量を削減する
- **禁止事項の遵守**: 絵柄変更・キャラクターデザイン変更・AI再生成・新規イラスト・Phase 3 balance 変更のいずれも行っていない

---

## 1. 事前監査で判明した「既存監査結果との食い違い」

実装前の preflight で、事前監査の前提のうち 4 点が事実と異なることが判明した。
CEO へ報告し、修正方針の承認を得たうえで実装している。

| # | 事前監査の想定 | 実測された事実 | 影響 |
|---|---|---|---|
| 1 | 神の `front.webp`（1600px）は `front.png` の高解像度版 | **別イラスト**（直立ポーズ・白背景）。`front.png` との PSNR は 8.4〜10.2 dB | 採用すると全神の絵が変わる。**不採用**。真の高解像度原本は `main.webp`（PSNR 35.3〜37.9 dB＝同一の絵） |
| 2 | 敵 WebP は旧 PNG の圧縮劣化（ディテール 30〜49% 低下） | 5 体中 3 体（試練の影・銀甲の機工師・乱舞の道化）は**決定99/100 で差し替えた別イラスト**。「30〜49% 低下」は別画像同士を比較した数値 | この 3 体は `art.png` を source にできない（旧デザインに戻る）。**変更なし** |
| 3 | 一部の敵は 384×512 を 512×512 へ引き伸ばした二重劣化 | commit `5b1e1b7` のとおり **bbox 抽出＋パディング**。oni の content aspect ratio は png/webp とも 0.8276 で一致 | 「引き伸ばし」は存在しない。ただし juuma のみ 1.2 倍に拡大されている |
| 4 | 神の 480px は DPR2 に不足 | 戦闘画面の最大表示は 200〜220 CSS px。DPR2 なら 400〜440px で、480px でほぼ足りていた | 実際の粗さの主因は解像度ではなく**エッジのジャギー（過剰なシャープ処理を伴う縮小）**だった |

## 2. 実施内容

### 2-1. 神（7柱）

`front.png`（480px PNG）→ `front_640.webp`（640px WebP q88）。

- **RGB**: `main.webp`（1600px、`front.png` と同一の絵）から Lanczos3 縮小＋軽微なシャープ（sigma 0.8 / m2 2.0）
- **アルファ**: 出荷中の `front.png` の切り抜き（決定34・35）を流用
- **白マット除去**: `main.webp` は白背景が焼き込まれているため、合成前に白マットを割り戻した。シルエット端の平均輝度が 232 → 207 に低下（白フチが減った）
- サイズ根拠：最大表示は「DPR3 スマホ × 200px = 600px」と「DPR2 デスクトップ × 220px = 440px」。640px が最小十分値。768px も試したが 400px 描画での差は 1.5 dB でありサイズ増に見合わない

### 2-2. 敵（7体）

| 敵 | 対応 | 理由 |
|---|---|---|
| 業斧の鬼将 (oni) | `art_hq.webp` を新規作成 | `art.png` が現行 WebP の真の source。同じ幾何変換（bbox 抽出→360×435→(76,39) 配置）を可逆な PNG から再実行 |
| 双牙の魔獣 (juuma) | `art_hq.webp` を新規作成 | 同上（本体のみ抽出→428×432→(45,41)）。破片は本体と非接触のため自動的に除外される |
| 藍花の怨霊 (onryo) | `art_hq.webp` を新規作成 | PNG のまま配信されていた。寸法・構図無変更の再エンコード |
| 蒼海の龍神 (ryujin) | `art_hq.webp` を新規作成 | 同上 |
| 試練の影 (datenshi) | **変更なし** | 現行 `art.webp` が現行デザインの唯一のコピー。これ以上の情報は存在しない |
| 銀甲の機工師 (karakuri) | **変更なし** | 同上 |
| 乱舞の道化 (doukeshi) | **変更なし** | 同上 |

oni / juuma は配置が旧 `art.webp` と**完全一致**（512×512／本体の位置・サイズがピクセル単位で同じ）であることを検証済み。表示位置・サイズは不変。

### 2-3. OTOMO（21画像）

`<form>_transparent.webp`（1600px）→ `<form>_320.webp`（320px WebP q86）。

- 最大表示は `.portrait img` の 128px（デスクトップ）／96px（モバイル基準）。GameOver 72px、成長画面ギャラリー 24px
- 256px も試したが DPR3（288px 必要）で PSNR 26.1 dB と不足。320px で 34.9 dB を確保
- 精霊態の半透明発光を潰さないため、**シャープ処理は一切かけていない**。alphaQuality は 100（可逆）

## 3. 画質の定量検証

同一表示サイズで描画したうえでの PSNR。

| 対象 | 指標 | before | after |
|---|---|---|---|
| 神 7柱 | 1600px 原本比 PSNR @400px（DPR2） | 30.37 dB | **30.34 dB**（同等） |
| 神 7柱 | 1600px 原本比 PSNR @600px（DPR3） | 22.04 dB | **28.42 dB**（+6.4 dB） |
| 双牙の魔獣 | 可逆 PNG 比 PSNR @480px | 23.61 dB | **34.96 dB**（+11.4 dB） |
| 業斧の鬼将 | 可逆 PNG 比 PSNR @480px | 34.71 dB | **35.31 dB** |
| 藍花の怨霊 / 蒼海の龍神 | 出荷中 PNG 比（不透明部）| — | 31.5 / 31.8 dB、アルファは PSNR ∞（可逆） |
| OTOMO 21画像 | 1600px 原本比 PSNR @192px（DPR2）| — | **38.90 dB**（最小 36.10） |
| OTOMO 21画像 | 1600px 原本比 PSNR @288px（DPR3）| — | **34.94 dB**（最小 32.18） |

神の DPR2 が「同等」で改善に見えないのは、旧 `front.png` が過剰なシャープ処理により**ジャギー（偽のエッジ）**を持っていたため。等倍描画の目視比較では、釣り糸・輪郭・髪の階段状のギザつきが解消していることを確認済み。

## 4. 容量

| グループ | before | after | 差 |
|---|---|---|---|
| 神 front（7） | 1,897.6 KB | 682.7 KB | -64.0% |
| 敵 art（7） | 1,206.0 KB | 547.7 KB | -54.6% |
| OTOMO 3形態（21） | 6,357.0 KB | 432.0 KB | -93.2% |
| **合計** | **9,460.6 KB** | **1,662.4 KB** | **-82.4%** |

- キャラクター＋背景アセット総量：12.97 MB → 5.35 MB（-58.7%）
- 1バトルの実ダウンロード想定（神1・敵1・OTOMO1形態・ステージ1）：1,100.8 KB → 503.9 KB（-54.2%）
- oni / juuma のみ容量が増えている（+24%）。これは劣化を取り戻すための意図的な増加

**JS バンドルは不変**：`index.js` 376,162 B → 376,168 B（+6 B）、gzip は 115.41 kB で同一。CSS はハッシュまで同一（`index-CDbAuk7l.css`）＝**CSS 変更ゼロ**。

## 5. CSS 変更の有無

**変更なし。** 神は 480→640 の正方形、OTOMO は 1600→320 の正方形、敵は寸法そのものが不変のため、`background-size: contain` / `object-fit: contain` がそのまま機能する。aspect ratio 対応の CSS 修正は不要だった（ビルド後の CSS ハッシュ一致で裏付け）。

## 6. QA 結果

| 項目 | 結果 |
|---|---|
| `tsc -b` | PASS（エラー 0） |
| `oxlint` | PASS（警告 2 件は master 既存・`scripts/phase3-audit` 配下で本変更と無関係） |
| `vitest run` | **223 files / 2,727 tests PASS**（既存 2,724 + 今回追加 3） |
| 追加テスト | 神 front / OTOMO 3形態 / 敵 art の実ファイル存在チェックを 3 件追加（決定124 の stage 背景テストと同方式） |
| clean build | PASS（`rm -rf dist` から 3.94s） |
| 神 asset HTTP 200 | 7/7 |
| 敵 asset HTTP 200 | 7/7 |
| OTOMO asset HTTP 200 | 21/21 |
| broken image | **0**（成長画面の 9 件は `loading="lazy"` 由来。強制ロードで全件成功を確認） |
| console error | **0** |
| network error | **0**（HTTP 4xx/5xx なし） |
| 旧アセットの残存参照 | **0**（`front.png` / `_transparent.webp` / 旧 `art` はいずれもフェッチされない） |
| save / resume | PASS（ラウンド2で保存 →リロード→「続きから（恵比寿・ラウンド2）」→復帰時も新アセットで描画） |
| Daily | PASS（今日の神域挑戦：銀甲の機工師・SEED `Q4PEDW` を正常表示） |
| battle layout | PASS（敵 283×304 / 神 220×240 / OTOMO 128×128＝既存の階層 敵≳神>OTOMO を維持） |
| balance simulation | 実施せず（画質パッチのため不要） |

### 6-1. テスト実行時の注意（環境依存の失敗について）

preview サーバーと Chrome を起動したまま `npm test` を回すと、`balanceSim.test.ts` の
3〜6 件が `Test timed out in 5000ms` で失敗する（実行時間が 89s → 188〜280s に伸びる）。

これは**本変更とは無関係の環境要因**であることを確認済み：

- 変更を `git stash` した**クリーンな master でも同一のタイムアウトが再現**する
- 失敗件数が実行ごとに変動する（6 件 → 4 件 → 3 件）
- CPU 負荷を落として再実行すると **223 files / 2,727 tests が全て PASS**

決定129 で既に「`balanceSim` STAKE-01 の 5000ms 既定タイムアウトは QA infrastructure backlog」
として記録済みの事象であり、今回もタイムアウト値は変更していない。

なお `npm test` は `.claude/worktrees/agent-*/` 配下の過去セッションの worktree も拾う。
リポジトリ本体だけを対象にする場合は `npx vitest run --dir src` を使う。

## 7. Known Risks

1. **試練の影・銀甲の機工師・乱舞の道化は今回改善できない。** 現行の `art.webp` がそのデザインの唯一のコピーで、より高品質な source が存在しない。CEO が「粗い」と感じた敵がこの 3 体だった場合、今回の変更では解決しない。改善するには元絵の再入手または再生成が必要で、これは CLAUDE.md §6-3 の CEO 判断事項。
2. **敵アセットは全体的に 512px が上限。** デスクトップの `.enemy-avatar` は 280 CSS px なので DPR2 では 560px が必要だが、原画自体が 384〜512px しかないため物理的に届かない。DPR2 デスクトップでは敵だけわずかに解像度が不足する状態が残る。
3. **神の 640px は DPR3 かつ 900px 幅以上の環境で 97% 充足**（660px 必要に対し 640px）。DPR3 端末はほぼスマホ＝900px 未満のレイアウト（200px 表示・600px 必要）に入るため実害は想定しにくいが、DPR3 の大型タブレットでは理論上わずかに不足する。
4. **旧アセットを温存しているためリポジトリ／deploy 容量は減らない。** ロールバック用に `front.png`・`<form>_transparent.webp`・旧 `art` を残す方針（決定99/100 と同じ併置方式）。ユーザーのダウンロード量には影響しない。

## 8. Human Visual QA 推奨（1組）

- **神**：恵比寿
- **敵**：双牙の魔獣（今回いちばん改善幅が大きい／PSNR +11.4 dB）
- **OTOMO**：鯛丸 — 精霊態（半透明の発光が潰れていないか）

確認観点：顔・輪郭・髪・衣装・透明エッジ・背景との解像感差。大量の再戦は不要で、1 戦の開始画面で判断できる。

---

## 9. Production Release（2026-09-06）

**CEO Human Visual QA：PASS**（恵比寿／双牙の魔獣／鯛丸・精霊態をローカル preview で確認）→ Production Release GO。

### 9-1. リリース手順

| 項目 | 値 |
|---|---|
| merge | `feat/visual-quality-assets`（`32a062a`）→ master へ `--no-ff` merge（**`01ac6f8`**） |
| push | `bab4eb3..01ac6f8 master -> master` |
| master / origin/master | ともに `01ac6f8`（**ahead/behind 0/0**） |
| merge 内容 | 39 files（新規 asset 32＋`gods.ts`/`enemies.ts`/`otomo.ts`＋テスト2＋docs2）。`.claude/settings.local.json`・`敵画像/`・`scripts/phase3-audit/out/` は **0件**（差分検査で確認） |
| deploy | Vercel Production 自動 deploy 完了 |

### 9-2. 本番 bundle 検証

| 項目 | 結果 |
|---|---|
| JS | `assets/index-Sm3K62_I.js` 376,179 B — ローカル clean build と **sha256 一致**（`776b2d6b87a7d3ec…`） |
| CSS | `assets/index-CDbAuk7l.css` 96,423 B — 同じく **sha256 一致**（`4ee6657aa8439ee1…`）。ハッシュはリリース前 master と同一＝**CSS 変更ゼロを本番でも再確認** |
| bundle 内の新パス | `front_640.webp` 1（テンプレート）／`art_hq.webp` 4／`spirit_320`・`incarnate_320`・`doji_320` 各1 |
| bundle 内の旧パス | `front.png` **0**／`_transparent.webp` **0**／敵の `art.png` **0** |

### 9-3. 本番 asset 検証

| 対象 | 件数 | HTTP | Content-Type | リポジトリとの一致 |
|---|---|---|---|---|
| 神 `front_640.webp` | **7/7** | 200 | image/webp | sha256 一致 |
| 敵 `art_hq.webp` | **4/4** | 200 | image/webp | sha256 一致 |
| 敵 据え置き `art.webp` | 3/3 | 200 | image/webp | （無変更） |
| OTOMO `*_320.webp` | **21/21** | 200 | image/webp | sha256 一致 |
| **合計** | **32/32** | **全200・4xx/5xx 0件** | — | **byte 単位で全件一致（mismatch 0）** |

### 9-4. 容量（本番実測）

| グループ | before | after | 差 |
|---|---|---|---|
| 神 front（7） | 1,897.6 KB | 682.7 KB | -64.0% |
| 敵 art（7・据え置き3体を含む） | 1,206.0 KB | 547.7 KB | -54.6% |
| OTOMO 3形態（21） | 6,357.0 KB | 432.0 KB | -93.2% |
| **合計** | **9,460.6 KB** | **1,662.4 KB** | **-82.4%** |

- 目標 1,662.4 KB に対し**実測 1,662.4 KB（完全一致）**
- 1バトルの実ダウンロード（神1・敵1・OTOMO1形態＝恵比寿／双牙の魔獣／鯛丸・精霊態）：**800.0 KB → 203.0 KB（-74.6%）**

### 9-5. テスト（リリース後の master）

`npx vitest run --dir src` → **54 files / 614 tests 全 PASS**（16.70s）。
決定129 で QA infrastructure backlog としていた `balanceSim` STAKE-01 のタイムアウトは、
preview サーバーを停止した状態では**再現せず PASS**（環境要因であることが再確認された）。

### 9-6. Production Visual QA（**未実施 / PENDING**）

ブラウザ実機での本番 Visual QA は、**PC再起動後に Chrome 拡張（Claude in Chrome）が未接続**の
ため実行できなかった（`tabs_context_mcp` が3回とも "Browser extension is not connected"）。
**本番側の不具合ではない。** 以下が未消化：

- 恵比寿／双牙の魔獣／鯛丸・精霊態の**本番実機での表示確認**
- 代表 別1組（別の神・敵・OTOMO）の表示確認
- alpha edge／battle layout／animation の実機確認
- console error・network error の実機計測
- save / resume の実機確認

**代替として担保できている範囲**：CEO の Human Visual QA（ローカル preview、同一ビルド・同一
バイナリのアセット）が PASS。本番の bundle と 32 アセットは**ローカル検証物と byte 単位で一致**
しており、描画結果が異なる余地は無い。加えて実ファイル存在チェックのテスト3件と 614 tests が
PASS。**この状態を「未消化」として明示し、PASS 扱いにはしない。**

### 9-7. Known Risk（更新）

1. **試練の影・銀甲の機工師・乱舞の道化は今回変更していない。** より高品質な原本が存在しない
   ためで、**FAIL ではなく将来の Asset Art Quality backlog**。改善には元絵の再入手または
   再生成が必要＝CLAUDE.md §6-3 の CEO 判断事項。
2. **asset 変換用スクリプトが残っていない。** 今回の変換は一時スクリプトで実行し、リポジトリに
   commit しなかったため、**同じ変換を再現できない**。成果物は全て commit 済みで今回の
   リリースには影響しないが、**再現可能な asset pipeline（`scripts/assets/` 配下への変換
   スクリプト整備）を maintenance backlog** とする。
3. 敵は原画自体が 384〜512px のため DPR2 デスクトップ（560px 必要）には届かない（継続）。
4. 神 640px は DPR3 かつ 900px 幅以上で 97% 充足（継続）。
5. 旧アセットはロールバック用に温存するためリポジトリ容量は減らない（ユーザーDL量には影響なし）。

### 9-8. リリース判定

**P0：0件／P1：0件／rollback：不要／status：RELEASED**（Production Visual QA のみ PENDING）
