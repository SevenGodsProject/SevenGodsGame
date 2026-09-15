# art-source / audio-source（配信しない原素材）

Release Hygiene Gate（決定170）で、**`public/` に置いたままだと Production へそのまま
配信されてしまう「実行時に参照していない原素材」** をここへ移した。
消したのではなく、配信対象から外しただけで、Git の履歴も `git mv` なのでそのまま残っている。

| ディレクトリ | 中身 | なぜ配信しないか |
|---|---|---|
| `art-source/cards/` | カード絵の PNG マスター 56 枚（200MB） | 実行時に読むのは同名の `.webp`（`public/assets/cards/`）だけ |
| `art-source/reference/gods/` | 神キービジュアルの原本 PNG 7 枚（20MB） | 配信しているのは派生の `public/assets/gods/*/keyvisual*.webp` |
| `art-source/otomo/<id>/` | OTOMO の 1600px 版と `*_transparent`（20MB） | 実行時に読むのは `*_320.webp` と `background.webp` だけ |
| `art-source/enemies/` | 敵 3 体の生成原本 PNG（datenshi 1199×1312 / karakuri 1065×1477 / doukeshi 1254×1254、透過・6MB） | 配信は `public/assets/enemies/*/art.webp`（768px WebP）。決定174 Batch A でここから書き出した |
| `art-source/enemies/juuma-restoration-pilot/M4_unmatte_2step-1024.webp` | juuma の非生成修復 Pilot（決定177）の到達点そのもの（白マット除去＋2段拡大・1024・242KB） | 配信は `public/assets/enemies/juuma/art_hq.webp`（768px WebP）。決定179 でここから単純リサイズ＋WebP再エンコードのみで書き出した（AI redraw・inpainting・追加修復は一切行っていない） |
| `art-source/enemies/oni-restoration-pilot/M4_unmatte_2step-1024.webp` | oni の非生成修復 M4（CEO実機QA承認 2026-09-15）の到達点そのもの（1024・192KB・sha256 `78de6fe9…`） | 配信は `public/assets/enemies/oni/art_hq.webp`（768px WebP）。決定181 でここから単純リサイズ＋WebP再エンコードのみで書き出した（AI redraw・inpainting・追加修復は一切行っていない） |
| `art-source/enemies/ryujin-restoration-pilot/M4i_unmatte_interior_2step-1024.webp` | ryujin の非生成修復 M4i（CEO実機QA承認 2026-09-15）の到達点そのもの（白マット除去＋内部alpha復元＋2段拡大・1024・256KB） | 配信は `public/assets/enemies/ryujin/art_hq.webp`（768px WebP）。決定182 でここから単純リサイズ＋WebP再エンコードのみで書き出した（AI redraw・inpainting・追加修復は一切行っていない） |
| `art-source/enemies/onryo-restoration-pilot/M4i_unmatte_interior_2step-768x1024.webp` | onryo の非生成修復 M4i（CEO実機QA承認 2026-09-16）の到達点そのもの（白マット除去＋内部alpha復元＋2倍拡大・768×1024・aspect0.75を保持・218KB） | 配信は `public/assets/enemies/onryo/art_hq.webp`（576×768 WebP、aspect0.75を保持）。決定183 でここから単純リサイズ＋WebP再エンコードのみで書き出した（AI redraw・inpainting・追加修復・正方形化は一切行っていない） |
| `audio-source/bgm/` | BGM の原音源 MP3 200kbps 4 本（26MB） | 配信は `public/assets/bgm/*.webm`（Opus 48k）と `*.mp3`（96k フォールバック） |

## 使い方

- 画像の作り直し・書き出しはここの原本から行う
- 敵 asset を書き出し直す：`npm i sharp --no-save` のあと
  `node scripts/enemy-visual-batch-a/export.mjs <sources.json> --out <dir> --apply`（構図は現行 asset から自動で引き継ぐ）
- BGM を再エンコードする：`npm i ffmpeg-static --no-save` のあと
  `node scripts/release-hygiene/audio.mjs encode`（`audio-source/bgm/*.mp3` → `public/assets/bgm/`）
- 配信対象に未参照ファイルが増えていないかの監査：`node scripts/release-hygiene/assets.mjs`

**ここに置いたファイルをアプリから参照してはいけない**（`public/` の外はビルド出力に含まれない）。
