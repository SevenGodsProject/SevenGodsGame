# 動画 technical budget・Performance Gate・7 神試算【推測を明示】

## 1. 表示面の実測から決まる要件【実測】
| 項目 | 値 | 出典 |
|---|---|---|
| カットインの神の円 | PC `clamp(148px, 34vh, 252px)`・SP `clamp(136px, 44vw, 188px)` | `battle.css:1699-1703・1794-1796` |
| @2x での最大描画 | 504×504 | 上の 252px × DPR 2 |
| 形 | 1:1・円マスク（`border-radius: 50%`）・`object-fit: cover` | `battle.css:1709-1720` |
| 表示時間の枠 | 現行 900ms（200〜1,100） | `enemyVfxTiming.ts` |
| 音 | 動画は無音必須（iOS の自動再生条件・SE は既存） | `bgm.ts`／`sound.ts` |

→ **720×720 で十分**（504px の 1.4 倍）。1080² は無駄（容量 2.25 倍・decode 2.25 倍）。

## 2. 推奨 encode spec【AI 判断・容量は推測】
| 項目 | 推奨 | 理由 |
|---|---|---|
| 解像度 | **720×720**（1:1） | 円 ≤504px@2x |
| 尺 | **1.2s（29f @24fps）**。生成は 2s 以上で作り、最良の 1.2s を切り出す | §3 のタイムライン |
| fps | 24 | 生成モデルの既定（決定204 の Test は 23.9fps）・CSS の突き 0.6s と同期しやすい |
| 主 codec | **WebM／VP9**（CRF 30〜33・`-tune-content` なし・2-pass・`-g 24`） | Chrome／Firefox／Android。Safari の VP9-in-WebM は版依存【要実機確認】 |
| 副 codec | **MP4／H.264 High**・CRF 20〜23・`+faststart`・yuv420p・**音声トラックなし** | iOS Safari 確実。決定204 §1 の「Baseline・AAC あり・18Mbps」を再エンコード必須とした教訓 |
| alpha | 使わない（VP9 alpha／HEVC alpha の二重管理を避ける＝決定204 と同じ判断） | 背景は暗色の平板を焼き込む |
| 容量目標 | **WebM ≤ 450KB／MP4 ≤ 650KB**（1.2s・720²・3〜4Mbps）【推測】 | 1 戦で読むのは 1 本（選んだ神・対応 codec）。BGM 1 曲（webm 1.6〜1.9MB）より小さい |
| poster | なし（`<img>`（既存 keyvisual）を下に敷き、`playing` で動画を上に出す） | LCP／CLS 0 |

## 3. 読み込み戦略【AI 判断】
| 段階 | 動作 |
|---|---|
| 初期バンドル | 変化なし（動画は JS に含めない。`<video>` は必要時に mount） |
| 戦闘開始（Boss Entrance 1.5s の間） | 選んだ神 1 本だけ `fetch`／`<video preload="auto" muted playsinline>` を作り**非表示で保持**（`fetchpriority="low"`）。Boss Entrance 中は他の描画負荷が低い |
| 共鳴 ≥4（`charged`） | 何もしない（既に取得済み）。取得が終わっていなければ続行 |
| commit（burst） | `video.readyState >= 3`（HAVE_FUTURE_DATA）かつ `error` なし → premium 経路。それ以外 → **現行の静止カットイン**（判定は commit 時に 1 回。途中で切り替えない） |
| cache | 通常の HTTP cache（Vercel の静的配信・`Cache-Control` 既定）。同じ神で 2 戦目以降は取得 0 |
| 再開（続きから） | 戦闘 mount 時に同じ経路で取得開始 |
| メモリ | 1 本のみ保持・戦闘終了で `src=''`＋`load()` で解放 |

## 4. 端末別の前提【知識・要実機確認】
| 端末 | 自動再生 | codec | 注意 |
|---|---|---|---|
| iOS Safari | `muted`＋`playsinline` かつユーザー操作後なら可。**低電力モードでは `play()` が reject** → 即フォールバック | MP4/H.264 確実 | `video.volume` は無視されるが無音動画なので無関係 |
| Android Chrome | `muted` なら可 | WebM/VP9・MP4 とも可 | 低端末の decode：720² 24fps は実用範囲【推測】。dropped frames を Gate で測る |
| PC（Chrome／Edge／Firefox／Safari） | 可 | WebM 優先・MP4 fallback | — |

## 5. Performance Gate（Pilot 実装時・実装前に固定）【AI 判断】
| # | 条件 | 測定 | 許容値 |
|---|---|---|---|
| PG1 | PC 1508×660・cached | Playwright：commit→`video.playing`→`ended` の時刻、`getVideoPlaybackQuality()`、console | 着弾時刻の誤差 ≤ 40ms・dropped ≤ 2%・error 0 |
| PG2 | iPhone 相当 SP 390×844（Chromium mobile emulation）＋実機 iPhone | 同上＋実機は目視と `webkitDecodedFrameCount` | dropped ≤ 5%・横スクロール 0・箱の差 0px |
| PG3 | Android 相当（Chromium・CPU throttling 4x） | 同上 | dropped ≤ 8%・着弾誤差 ≤ 80ms |
| PG4 | throttled 3G（uncached） | 取得完了時刻・フォールバック発動 | 戦闘開始からの取得が commit に間に合わなければ**静止カットインへ**（誤差 0・ロック延長 0） |
| PG5 | load failure（404） | 強制 404 | 静止カットイン・console error 0（`onerror` は握る） |
| PG6 | decode failure（壊れたファイル） | 破損 mp4 | 同上 |
| PG7 | reduced-motion | emulate | 動画を出さない（静止カットイン）＝現行と同一 |
| PG8 | 初期バンドル差 | build | JS ≤ +3KB・CSS ≤ +2KB |
| PG9 | 動画資産 | ファイル | WebM ≤ 450KB・MP4 ≤ 650KB |
| PG10 | first battle load | Boss Entrance 開始〜手札操作可能まで | Before と差 ≤ 50ms（動画は低優先で並列） |
| PG11 | memory | Chrome `performance.memory` 差（PC）・実機は目視のみ | ≤ +30MB（decode バッファ）【推測の閾値】 |
| PG12 | layout shift | CLS | 0（fixed 層の中で完結） |
| PG13 | engine 不変 | golden・gameVersion・1,235 tests・同 seed の runtime paired-seed | 完全一致 |
| PG14 | 入力ロック | commit→次のカードが押せるまで | premium：1,600ms 以下（＝カットイン 1,400＋lead 200）。static：1,100 不変 |

## 6. 7 神展開の試算【推測】
| 項目 | 大耀 1 本 | 7 神 |
|---|---|---|
| 配信容量（WebM＋MP4） | ≈1.1MB | ≈7.7MB（CDN 上。1 戦で読むのは 1 本） |
| 1 戦の追加転送（uncached） | ≤650KB | 同じ（神は 1 柱） |
| 生成回数 | ≤3 | ≤21（ただし 1 神ずつ・失敗した神は打ち切り） |
| 生成コスト | 単価 × ≤3【WEB確認必要】 | 単価 × ≤21【WEB確認必要】 |
| 前処理（front_640 → 合成板） | 1 | 7（スクリプト化で自動） |
| motion brief | 1 | 7（signature object が神ごとに違う：小槌砲・釣竿・槍・ギター・杖・？・扇。**単純 7 倍にならないのはここ**） |
| 機械受入 | 1 | 7（同じスクリプト） |
| Human QA | 5 問 × 1 | 5 問 × 7（1 神 1 戦・A/B） |
| 保守 | codec 更新・容量監視 | 同上 × 7・神の絵を差し替えたら再生成 |
| 共有できるもの | シーケンス（尺・タイミング・フォールバック・encode・Gate）は 7 神で完全に同一 | — |
| 共有できないもの | 動きの内容（何を動かすか）・identity の受入点（顔・髪・小物） | — |
