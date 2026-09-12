# art-source / audio-source（配信しない原素材）

Release Hygiene Gate（決定170）で、**`public/` に置いたままだと Production へそのまま
配信されてしまう「実行時に参照していない原素材」** をここへ移した。
消したのではなく、配信対象から外しただけで、Git の履歴も `git mv` なのでそのまま残っている。

| ディレクトリ | 中身 | なぜ配信しないか |
|---|---|---|
| `art-source/cards/` | カード絵の PNG マスター 56 枚（200MB） | 実行時に読むのは同名の `.webp`（`public/assets/cards/`）だけ |
| `art-source/reference/gods/` | 神キービジュアルの原本 PNG 7 枚（20MB） | 配信しているのは派生の `public/assets/gods/*/keyvisual*.webp` |
| `art-source/otomo/<id>/` | OTOMO の 1600px 版と `*_transparent`（20MB） | 実行時に読むのは `*_320.webp` と `background.webp` だけ |
| `audio-source/bgm/` | BGM の原音源 MP3 200kbps 4 本（26MB） | 配信は `public/assets/bgm/*.webm`（Opus 48k）と `*.mp3`（96k フォールバック） |

## 使い方

- 画像の作り直し・書き出しはここの原本から行う
- BGM を再エンコードする：`npm i ffmpeg-static --no-save` のあと
  `node scripts/release-hygiene/audio.mjs encode`（`audio-source/bgm/*.mp3` → `public/assets/bgm/`）
- 配信対象に未参照ファイルが増えていないかの監査：`node scripts/release-hygiene/assets.mjs`

**ここに置いたファイルをアプリから参照してはいけない**（`public/` の外はビルド出力に含まれない）。
