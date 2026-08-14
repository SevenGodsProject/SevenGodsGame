# SEVEN GODS

React + TypeScript + Phaser 3 で開発する 2D ゲームプロジェクトです。

## 必要なもの

| ツール | 確認コマンド |
| --- | --- |
| Node.js | `node -v` |
| npm | `npm -v` |
| Git | `git --version` |

## 使い方

```bash
npm install     # 初回のみ。必要な部品をダウンロード
npm run dev     # 開発サーバー起動。表示された http://localhost:5173 を開く
npm run build   # 公開用ファイルを dist/ に書き出す
npm run preview # build した結果を確認する
npm run lint    # コードの書き方をチェックする
```

開発サーバーは **ファイルを保存した瞬間にブラウザへ反映されます**（HMR）。
止めるときはターミナルで `Ctrl + C`。

## フォルダ構成

```
public/
└─ assets/            画像・音声を置く場所（Phaser からは 'assets/xxx.png' で参照）
src/
├─ game/              ★ Phaser 担当 = ゲーム本体
│  ├─ scenes/
│  │  └─ MainScene.ts   最初に表示される場面
│  └─ gameConfig.ts     画面サイズ・物理エンジンなどの初期設定
├─ components/        ★ React 担当 = UI
│  └─ PhaserGame.tsx    React と Phaser をつなぐ橋渡し
├─ App.tsx            画面全体の土台（ヘッダー・フッターなど）
├─ App.css
├─ index.css
└─ main.tsx           アプリの起動地点
```

### 役割分担のルール

- **Phaser（`src/game/`）** … キャラの移動、当たり判定、アニメーション、演出
- **React（`src/components/`）** … メニュー、HP バー、所持金表示、設定画面などの UI

この 2 つを混ぜないことが、あとから読みやすいコードを保つコツです。

## シーンを追加するとき

1. `src/game/scenes/` に `新しいシーン.ts` を作る
2. `src/game/gameConfig.ts` の `scene: [...]` 配列に追記する
3. 移動するときは `this.scene.start('シーン名')`

## デバッグのヒント

`src/game/gameConfig.ts` の `debug: false` を `true` にすると、
当たり判定の枠が緑の線で表示されます。動きがおかしいときに便利です。
