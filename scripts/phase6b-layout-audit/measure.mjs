// Phase 6-B：戦闘画面レイアウトの実測（監査用。ゲームコードではない）。
//
//   node scripts/phase6b-layout-audit/measure.mjs <outJson> [baseUrl] [--shots <dir>]
//
// 現状レイアウトと、候補レイアウト（A/B/C/D）を **同じ条件** で測る。候補は
// 「このスクリプトの中で CSS を注入するだけ」で、リポジトリの CSS には一切触れない。
//
// 主要な指標：
//   - 各要素の top/bottom（CSS px、scrollY=0 のとき）
//   - 手札が操作できる位置（＝カード全体が見える scrollY）と、そのときの
//     「敵ポートレートの可視率」＝ Phase 6-A の着弾演出が実際に見えるか
//   - 固定要素（ラウンドを終えるボタン）と手札の重なり
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null
/** Phase 6-B 実装後：実装そのもの（candidate=current）だけを測りたいときに使う */
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null
if (shotsDir) mkdirSync(shotsDir, { recursive: true })
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

/**
 * CSS ビューポート（innerWidth × innerHeight）。ブラウザのタブ・ツールバーを引いた実寸で、
 * CEO 環境（1366×768・拡大率 90%）＝ 1508×660 は Phase 6 監査の実測値。
 */
const VIEWPORTS = [
  { id: 'pc-1366-100', label: '1366×768 / 100%', width: 1358, height: 594 },
  { id: 'pc-1366-90', label: '1366×768 / 90%（CEO環境）', width: 1508, height: 660 },
  { id: 'pc-1920', label: '1920×1080 / 100%', width: 1912, height: 906 },
  { id: 'sp-390-844', label: '390×844', width: 390, height: 760 },
  { id: 'sp-390-780', label: '390×780', width: 390, height: 696 },
  { id: 'sp-430-932', label: '430×932', width: 430, height: 848 },
]

/** 候補レイアウト（注入する CSS のみ。DOM は触らない） */
const CANDIDATES = {
  current: '',
  // A：アリーナ圧縮型（敵・神・OTOMO とパネル余白を詰めてアリーナ自体を低くする）
  A: `
@media (min-width: 900px) {
  .enemy-avatar { width: 190px; height: 200px; }
  .player-avatar { width: 150px; height: 165px; }
  .enemy-avatar-wrap::before { width: 230px; height: 230px; }
  .player-avatar-wrap::before { width: 200px; height: 200px; }
  .portrait-otomo img { width: 84px; height: 84px; }
  .battle-main { padding: 8px; gap: 8px; }
  .battle-main .panel { padding: 6px; gap: 4px; }
  .enemy-type-row, .enemy-speech-bubble, .god-tagline { display: none; }
  .burst-preview { font-size: 11px; }
  .battle { gap: 10px; }
}`,
  // B：Hand Dock 型（手札と「ラウンドを終える」を下部の固定ドックへ。アリーナはそのまま）
  B: `
@media (min-width: 900px) {
  .hand {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 4;
    margin: 0; padding: 10px 96px 10px 12px;
    background: linear-gradient(180deg, #05060d00, #05060dee 34%);
    backdrop-filter: blur(6px);
  }
  .battle { padding-bottom: 240px; }
  .end-round-button { bottom: 88px; left: auto; right: 16px; transform: none; }
  .end-round-button:not(:disabled):hover { transform: translateY(-2px); }
}`,
  // C：Hybrid（アリーナを軽く圧縮 ＋ 手札ドック）
  C: `
@media (min-width: 900px) {
  .enemy-avatar { width: 210px; height: 220px; }
  .player-avatar { width: 165px; height: 180px; }
  .enemy-avatar-wrap::before { width: 250px; height: 250px; }
  .portrait-otomo img { width: 92px; height: 92px; }
  .battle-main { padding: 8px; gap: 8px; }
  .battle-main .panel { padding: 6px; gap: 4px; }
  .enemy-speech-bubble { display: none; }
  .hand {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 4;
    margin: 0; padding: 10px 96px 10px 12px;
    background: linear-gradient(180deg, #05060d00, #05060dee 34%);
    backdrop-filter: blur(6px);
  }
  .battle { padding-bottom: 240px; gap: 10px; }
  .end-round-button { bottom: 88px; left: auto; right: 16px; transform: none; }
  .end-round-button:not(:disabled):hover { transform: translateY(-2px); }
}`,
  // D：Viewport Grid（画面の高さに収める。上＝ステータス／中＝アリーナ（可変）／下＝操作バー。
  //    ページ自体はスクロールしない。託宣・ログは操作バー側／アリーナ下の小領域へ）
  D: `
@media (min-width: 900px) {
  .battle {
    height: 100dvh; max-height: 100dvh; padding-bottom: 0; gap: 8px;
    display: grid; overflow: hidden;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    grid-template-areas: 'top' 'arena' 'divination' 'dock';
  }
  .battle-topbar { grid-area: top; }
  .battle-main { grid-area: arena; min-height: 0; padding: 8px; gap: 8px; }
  .divination-panel { grid-area: divination; padding: 6px 10px; }
  .divination-choice { padding: 6px 8px; }
  .divination-choice-text { display: none; }
  .hand { grid-area: dock; padding: 6px 96px 6px 6px; margin: 0; }
  .battle-log { display: none; }
  .battle-hud { display: none; }
  .battle-main .panel { padding: 6px; gap: 4px; min-height: 0; }
  .enemy-speech-bubble, .enemy-type-row, .god-tagline { display: none; }
  .enemy-avatar { width: min(210px, 26vh); height: min(220px, 28vh); }
  .player-avatar { width: min(165px, 21vh); height: min(180px, 23vh); }
  .enemy-avatar-wrap::before, .player-avatar-wrap::before { display: none; }
  .portrait-otomo img { width: min(92px, 11vh); height: min(92px, 11vh); }
  .card-view { min-height: 168px; }
  .card-view-clip { max-height: 96px; }
  .end-round-button { position: static; transform: none; align-self: center; }
}`,
}

// D2：D ＋ カードの実効高さを詰める（絵は残す）。PC で 594px にも収める
CANDIDATES.D2 = CANDIDATES.D + `
@media (min-width: 900px) {
  .card-view { width: 124px; min-height: 0; padding: 6px; gap: 2px; }
  .card-view-clip { height: 84px; }
  .card-view-has-art .card-view-body { padding: 14px 6px 4px; }
  .card-view-name { font-size: 12px; }
  .card-view-type { display: none; }
  .card-view-text { font-size: 10px; line-height: 1.25; }
  .card-view-bonus { font-size: 9px; }
  .hand { gap: 8px; }
}`

// P：推奨案。アリーナの高さを画面に合わせて可変にし、操作（託宣・手札・ラウンド終了）を
//    下部のドックへまとめる。PC もスマホも同じ考え方で、寸法だけ breakpoint で変える。
CANDIDATES.P = `
:root { --dock-hand: 196px; --dock-oracle: 56px; }
@media (min-width: 900px) {
  .battle { padding-bottom: calc(var(--dock-hand) + var(--dock-oracle) + 8px); gap: 10px; }
  .battle-main { padding: 8px; gap: 8px; }
  .battle-main .panel { padding: 6px; gap: 4px; }
  .enemy-speech-bubble { display: none; }
  .enemy-avatar { width: clamp(150px, 24vh, 240px); height: clamp(160px, 26vh, 260px); }
  .player-avatar { width: clamp(120px, 19vh, 190px); height: clamp(132px, 21vh, 210px); }
  .enemy-avatar-wrap::before { width: clamp(190px, 30vh, 300px); height: clamp(190px, 30vh, 300px); }
  .player-avatar-wrap::before { width: clamp(160px, 26vh, 260px); height: clamp(160px, 26vh, 260px); }
  .portrait-otomo img { width: clamp(64px, 11vh, 110px); height: clamp(64px, 11vh, 110px); }
  .burst-preview { font-size: 11px; }

  .hand {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 4; margin: 0;
    height: var(--dock-hand); align-items: center; gap: 8px;
    padding: 6px 12px; box-sizing: border-box;
    background: linear-gradient(180deg, #05060d00, #05060df2 34%);
    backdrop-filter: blur(6px);
  }
  .card-view { width: 124px; min-height: 0; padding: 6px; gap: 2px; }
  .card-view-clip { height: 88px; }
  .card-view-has-art .card-view-body { padding: 14px 6px 4px; }
  .card-view-type { display: none; }
  .card-view-name { font-size: 12px; }
  .card-view-text { font-size: 10px; line-height: 1.25; }
  .card-view-bonus { font-size: 9px; }

  .divination-panel {
    position: fixed; left: 0; right: 0; bottom: var(--dock-hand); z-index: 4;
    margin: 0; height: var(--dock-oracle); box-sizing: border-box;
    display: flex; align-items: center; gap: 10px;
    padding: 4px 220px 4px 12px;
    background: #05060de8; backdrop-filter: blur(6px);
  }
  .divination-panel-title { font-size: 11px; white-space: nowrap; margin: 0; }
  .divination-choices { display: flex; gap: 8px; flex: 1; }
  .divination-choice { padding: 4px 8px; gap: 6px; }
  .divination-choice-text { display: none; }
  .divination-choice-name { font-size: 11px; }
  .divination-choice-preview { font-size: 11px; }
  .end-round-button {
    position: fixed; right: 12px; bottom: calc(var(--dock-hand) + 6px);
    left: auto; transform: none; z-index: 5; padding: 10px 20px;
  }
  .end-round-button:not(:disabled):hover { transform: translateY(-2px); }
  .battle-log { display: none; }
  .intent { font-size: 20px; font-weight: 700; }
}
@media (max-width: 899px) {
  :root { --dock-hand: 172px; --dock-oracle: 52px; }
  .battle { padding-bottom: calc(var(--dock-hand) + var(--dock-oracle) + 8px); gap: 8px; }
  .battle-main { padding: 6px; gap: 6px; }
  .battle-main .panel { padding: 5px; gap: 3px; }
  .enemy-speech-bubble, .enemy-type-row, .god-tagline { display: none; }
  .enemy-avatar { width: 150px; height: 160px; }
  .player-avatar { width: 116px; height: 128px; }
  .enemy-avatar-wrap::before, .player-avatar-wrap::before { display: none; }
  .portrait-otomo img { width: 62px; height: 62px; }
  .burst-preview { display: none; }
  .hand {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 4; margin: 0;
    height: var(--dock-hand); box-sizing: border-box;
    display: flex; flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start;
    gap: 6px; padding: 6px 8px;
    background: linear-gradient(180deg, #05060d00, #05060df5 26%);
  }
  .card-view { width: 108px; min-height: 0; padding: 5px; flex: 0 0 auto; }
  .card-view-clip { height: 70px; }
  .card-view-has-art .card-view-body { padding: 12px 5px 4px; }
  .card-view-type { display: none; }
  .card-view-name { font-size: 11px; }
  .card-view-text { font-size: 9px; line-height: 1.2; }
  .divination-panel {
    position: fixed; left: 0; right: 0; bottom: var(--dock-hand); z-index: 4;
    margin: 0; height: var(--dock-oracle); box-sizing: border-box;
    display: flex; align-items: center; gap: 6px; padding: 3px 150px 3px 6px;
    background: #05060def;
  }
  .divination-panel-title { font-size: 10px; white-space: nowrap; }
  .divination-choices { display: flex; gap: 6px; flex: 1; }
  .divination-choice { padding: 3px 6px; }
  .divination-choice-text { display: none; }
  .divination-choice-name { font-size: 10px; }
  .end-round-button {
    position: fixed; right: 6px; bottom: calc(var(--dock-hand) + 4px);
    margin: 0; padding: 7px 12px; font-size: 12px; z-index: 5;
  }
  .battle-log { display: none; }
  .intent { font-size: 17px; font-weight: 700; }
}`

// P2：推奨案。.battle を画面の高さに収めるグリッドにし、アリーナ＝残り高さ（1fr）。
//     託宣バーと手札ドックは grid の行として確保するので、固定要素がアリーナを覆わない。
const P2_COMMON = `
  .battle {
    height: calc(100dvh - var(--app-chrome, 108px));
    max-height: calc(100dvh - var(--app-chrome, 108px));
    padding-bottom: 0; gap: 6px; overflow: hidden;
    display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto;
    grid-template-areas: 'top' 'arena' 'oracle' 'dock';
  }
  .battle-topbar { grid-area: top; }
  .battle-main { grid-area: arena; min-height: 0; overflow: hidden; }
  .divination-panel { grid-area: oracle; margin: 0; }
  .hand { grid-area: dock; margin: 0; }
  .battle-log, .battle-hud { display: none; }
  .battle-error { display: none; }
`
CANDIDATES.P2 = `
@media (min-width: 900px) {
${P2_COMMON}
  .battle-main { padding: 8px; gap: 8px; }
  .battle-main .panel { padding: 6px; gap: 4px; min-height: 0; }
  .enemy-speech-bubble, .enemy-type-row, .god-tagline { display: none; }
  .enemy-avatar { width: clamp(130px, 22vh, 240px); height: clamp(140px, 24vh, 260px); }
  .player-avatar { width: clamp(104px, 17vh, 190px); height: clamp(116px, 19vh, 210px); }
  .enemy-avatar-wrap::before, .player-avatar-wrap::before { display: none; }
  .portrait-otomo img { width: clamp(56px, 9vh, 110px); height: clamp(56px, 9vh, 110px); }
  .burst-preview { font-size: 11px; }
  .intent { font-size: 20px; font-weight: 700; }

  .divination-panel { display: flex; align-items: center; gap: 10px; padding: 4px 210px 4px 12px; }
  .divination-panel-title { font-size: 11px; white-space: nowrap; }
  .divination-choices { display: flex; gap: 8px; flex: 1; }
  .divination-choice { padding: 4px 8px; gap: 6px; }
  .divination-choice-text { display: none; }
  .divination-choice-name { font-size: 11px; }
  .hand { padding: 6px 12px; gap: 8px; align-items: center; }
  .card-view { width: 124px; min-height: 0; padding: 6px; gap: 2px; }
  .card-view-clip { height: clamp(58px, 11vh, 104px); }
  .card-view-has-art .card-view-body { padding: 12px 6px 4px; }
  .card-view-type { display: none; }
  .card-view-name { font-size: 12px; }
  .card-view-text { font-size: 10px; line-height: 1.25; }
  .card-view-bonus { font-size: 9px; }
  .end-round-button {
    position: absolute; right: 12px; bottom: 12px; left: auto; transform: none;
    z-index: 5; padding: 10px 18px;
  }
  .end-round-button:not(:disabled):hover { transform: translateY(-2px); }
}
@media (max-width: 899px) {
${P2_COMMON}
  .battle-main { padding: 6px; gap: 6px; }
  .battle-main .panel { padding: 5px; gap: 3px; min-height: 0; }
  .enemy-speech-bubble, .enemy-type-row, .god-tagline { display: none; }
  .enemy-avatar { width: clamp(118px, 19vh, 160px); height: clamp(126px, 20vh, 170px); }
  .player-avatar { width: clamp(92px, 14vh, 130px); height: clamp(100px, 16vh, 140px); }
  .enemy-avatar-wrap::before, .player-avatar-wrap::before { display: none; }
  .portrait-otomo img { width: 56px; height: 56px; }
  .burst-preview { display: none; }
  .intent { font-size: 17px; font-weight: 700; }
  .ally-row { grid-template-columns: 1.2fr 0.8fr; }

  .divination-panel { display: flex; align-items: center; gap: 6px; padding: 3px 120px 3px 6px; }
  .divination-panel-title { font-size: 10px; white-space: nowrap; }
  .divination-choices { display: flex; gap: 6px; flex: 1; }
  .divination-choice { padding: 3px 6px; }
  .divination-choice-text { display: none; }
  .divination-choice-name { font-size: 10px; }
  .hand {
    display: flex; flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start;
    gap: 6px; padding: 6px 8px 8px;
  }
  .card-view { width: 108px; min-height: 0; padding: 5px; flex: 0 0 auto; }
  .card-view-clip { height: clamp(54px, 9vh, 80px); }
  .card-view-has-art .card-view-body { padding: 12px 5px 4px; }
  .card-view-type { display: none; }
  .card-view-name { font-size: 11px; }
  .card-view-text { font-size: 9px; line-height: 1.2; }
  .end-round-button {
    position: absolute; right: 6px; bottom: 8px; left: auto; transform: none;
    margin: 0; padding: 7px 12px; font-size: 12px; z-index: 5;
  }
}`

// P3：P2 ＋「情報行」も圧縮する（Battle HUD 統合の効果を数値で見るための近似）
CANDIDATES.P3 =
  CANDIDATES.P2 +
  `
.panel-title { font-size: 12px; }
.burst-preview { display: none; }
.portrait-otomo figcaption { font-size: 9px; }
.buff-list .badge { font-size: 10px; padding: 1px 6px; }
.badge-block { font-size: 11px; }
.god-passive-badge { font-size: 10px; padding: 1px 6px; }
.divination-panel-title { display: none; }
.resonance-gauge { height: 16px; }
.resonance-gauge-label { font-size: 10px; }
@media (max-width: 899px) {
  .battle-main { display: grid; grid-template-columns: 1.05fr 0.95fr; align-items: start; }
  .enemy-panel { grid-column: 1; }
  .ally-row { grid-column: 2; grid-template-columns: 1fr; gap: 4px; }
  .enemy-avatar { width: clamp(112px, 17vh, 150px); height: clamp(118px, 18vh, 158px); }
  .player-avatar { width: clamp(84px, 12vh, 116px); height: clamp(92px, 13vh, 126px); }
  .portrait-otomo img { width: 48px; height: 48px; }
  .intent { font-size: 16px; }
  .hand { padding: 5px 6px 6px; }
  .end-round-button { bottom: 6px; right: 4px; padding: 6px 10px; }
}`

// D3：D2 ＋「ラウンドを終える」をドック行の右端に置く（固定ボタンの重なりを設計で解消）
CANDIDATES.D3 =
  CANDIDATES.D2 +
  `
@media (min-width: 900px) {
  .end-round-button {
    grid-area: dock; justify-self: end; align-self: center;
    position: static; transform: none; margin: 0 10px 0 0; z-index: 5;
    padding: 10px 18px;
  }
}`

// M3（スマホ）：アリーナ圧縮 ＋ 手札ドック（敵・HP・予告・手札を同時に見せる）
CANDIDATES.M3 = `
@media (max-width: 899px) {
  .enemy-avatar { width: 150px; height: 160px; }
  .player-avatar { width: 120px; height: 132px; }
  .enemy-avatar-wrap::before, .player-avatar-wrap::before { display: none; }
  .enemy-speech-bubble, .enemy-type-row, .god-tagline { display: none; }
  .portrait-otomo img { width: 64px; height: 64px; }
  .burst-preview { display: none; }
  .battle-main { padding: 6px; gap: 6px; }
  .battle-main .panel { padding: 5px; gap: 3px; }
  .battle { gap: 8px; padding-bottom: 210px; }
  .hand {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 4;
    margin: 0; padding: 8px 8px 10px; gap: 6px; flex-wrap: nowrap;
    overflow-x: auto; justify-content: flex-start;
    background: linear-gradient(180deg, #05060d00, #05060df2 30%);
  }
  .card-view { width: 112px; min-height: 0; padding: 5px; flex: 0 0 auto; }
  .card-view-clip { height: 74px; }
  .card-view-has-art .card-view-body { padding: 12px 5px 4px; }
  .card-view-type { display: none; }
  .card-view-name { font-size: 11px; }
  .card-view-text { font-size: 10px; line-height: 1.2; }
  .end-round-button { position: fixed; right: 8px; bottom: 176px; margin: 0; padding: 8px 14px; z-index: 5; }
}`

// M1（スマホ）：敵エリアを sticky にして、手札を見ている間も敵・HP・予告が残る
CANDIDATES.M1 = `
@media (max-width: 899px) {
  .enemy-panel {
    position: sticky; top: 0; z-index: 2;
    background: linear-gradient(180deg, #05060dF2 70%, #05060d00);
    backdrop-filter: blur(4px);
    padding: 6px; gap: 4px;
  }
  .enemy-avatar { width: 150px; height: 160px; }
  .enemy-avatar-wrap::before { display: none; }
  .enemy-speech-bubble, .enemy-type-row { display: none; }
  .battle-main { padding: 8px; gap: 8px; }
}`

// M2（スマホ）：アリーナ圧縮のみ（sticky なし）
CANDIDATES.M2 = `
@media (max-width: 899px) {
  .enemy-avatar { width: 150px; height: 160px; }
  .player-avatar { width: 130px; height: 145px; }
  .enemy-avatar-wrap::before, .player-avatar-wrap::before { display: none; }
  .enemy-speech-bubble, .enemy-type-row, .god-tagline { display: none; }
  .battle-main { padding: 8px; gap: 8px; }
  .battle-main .panel { padding: 6px; gap: 4px; }
}`

// P4：推奨案の最終形。P3 ＋「名札化」でしか消せない行を落としたときの寸法
//     （実装では 敵＝名前/HP/予告を1枚の名札、味方＝HP/共鳴を1行にまとめる想定）
CANDIDATES.P4 =
  CANDIDATES.P3 +
  `
.enemy-type-row, .enemy-speech-bubble, .god-tagline, .burst-preview { display: none; }
.portrait-otomo figcaption { display: none; }
.panel-title { font-size: 12px; line-height: 1.2; }
.divination-panel { padding-top: 2px; padding-bottom: 2px; }
.divination-choice { padding: 2px 8px; }
@media (min-width: 900px) and (max-height: 700px) {
  .card-view-clip { height: 72px; }
  .card-view { width: 118px; }
  .enemy-avatar { width: clamp(150px, 26vh, 200px); height: clamp(158px, 27vh, 210px); }
  .player-avatar { width: clamp(116px, 20vh, 160px); height: clamp(126px, 21vh, 172px); }
}
@media (max-width: 899px) {
  .card-view-clip { height: 62px; }
  .card-view { width: 104px; }
  .hand { padding-right: 84px; }
  .end-round-button { bottom: 50%; transform: translateY(50%); right: 4px; }
}`

// P5：最終寸法案（ドック164 / 託宣バー44 / アリーナ＝残り）。名札化で消える行は落とした状態
CANDIDATES.P5 =
  CANDIDATES.P4 +
  `
@media (min-width: 900px) {
  .battle { gap: 6px; }
  .divination-panel { height: 44px; box-sizing: border-box; padding: 2px 210px 2px 10px; }
  .hand { height: 164px; box-sizing: border-box; padding: 5px 10px; gap: 8px; }
  .card-view { width: 116px; padding: 5px; }
  .card-view-clip { height: 66px; }
  .card-view-has-art .card-view-body { padding: 10px 5px 3px; }
  .card-view-name { font-size: 11.5px; }
  .card-view-text { font-size: 9.5px; }
  .enemy-avatar { width: clamp(132px, 23vh, 210px); height: clamp(140px, 25vh, 226px); }
  .player-avatar { width: clamp(104px, 18vh, 168px); height: clamp(112px, 19vh, 182px); }
  .portrait-otomo img { width: clamp(48px, 8vh, 96px); height: clamp(48px, 8vh, 96px); }
  .end-round-button { bottom: 10px; right: 10px; padding: 9px 16px; }
}
@media (max-width: 899px) {
  .divination-panel { height: 46px; box-sizing: border-box; padding: 2px 96px 2px 6px; }
  .divination-choice-preview { display: none; }
  .hand { height: 168px; box-sizing: border-box; }
  .card-view { width: 100px; }
  .card-view-clip { height: 58px; }
  .enemy-avatar { width: clamp(104px, 16vh, 150px); height: clamp(112px, 17vh, 158px); }
  .player-avatar { width: clamp(80px, 12vh, 120px); height: clamp(88px, 13vh, 130px); }
  .resonance-gauge { height: 14px; }
}`

// P6：P5 ＋「名札化」（敵の HP・予告を立ち絵の上へ。実装では1枚の名札にまとめる）
CANDIDATES.P6 =
  CANDIDATES.P5 +
  `
.enemy-panel .panel-title { order: -3; }
.enemy-panel .hp-bar { order: -2; }
.enemy-panel .badge-block { order: -2; }
.enemy-panel .intent { order: -1; }
.enemy-panel .buff-list { order: -1; }
.player-panel .panel-title { order: -3; }
.player-panel .hp-bar { order: -2; }
.player-panel .badge-block { order: -2; }
.player-panel .buff-list { order: -1; }
`

CANDIDATES.P7 = CANDIDATES.P6 + `
/* 立ち絵は「名札の残り」に収まる可変サイズにする（切れない・縮んで全身が残る） */
.enemy-panel { display: flex; flex-direction: column; }
.enemy-stage { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; }
.enemy-stage .enemy-collapse, .enemy-stage .enemy-avatar-wrap, .enemy-stage .enemy-reaction, .enemy-stage .enemy-reaction-idle { height: 100%; display: flex; align-items: center; justify-content: center; }
.enemy-avatar { width: 100% !important; height: 100% !important; max-height: 100%; background-size: contain; }
.player-panel { display: flex; flex-direction: column; }
.player-windup { flex: 1 1 auto; min-height: 0; display: flex; }
.player-avatar-wrap { flex: 1 1 auto; min-height: 0; align-items: center; }
.player-avatar { width: auto !important; height: 100% !important; max-height: 100%; object-fit: contain; }
`

const MEASURE = () => {
  const r = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      top: Math.round(b.top + window.scrollY),
      bottom: Math.round(b.bottom + window.scrollY),
      h: Math.round(b.height),
      w: Math.round(b.width),
      fontSize: cs.fontSize,
      position: cs.position,
    }
  }
  const cards = [...document.querySelectorAll('.hand .card-view')].map((c) => {
    const b = c.getBoundingClientRect()
    return { top: Math.round(b.top + window.scrollY), bottom: Math.round(b.bottom + window.scrollY), h: Math.round(b.height), w: Math.round(b.width) }
  })
  const el = (sel) => document.querySelector(sel)
  const avatar = el('.enemy-avatar')
  const av = avatar ? avatar.getBoundingClientRect() : null
  const hand = el('.hand')
  const handRect = hand ? hand.getBoundingClientRect() : null
  const endBtn = el('.end-round-button')
  const endRect = endBtn ? endBtn.getBoundingClientRect() : null

  // 手札が「全部見える」ために必要なスクロール量（固定ドックなら 0）
  const docHeight = document.scrollingElement.scrollHeight
  const vh = window.innerHeight
  let scrollForHand = 0
  if (handRect && getComputedStyle(hand).position !== 'fixed') {
    const handBottomAbs = handRect.bottom + window.scrollY
    scrollForHand = Math.max(0, Math.min(docHeight - vh, Math.ceil(handBottomAbs - vh + 8)))
  }
  // そのスクロール位置での敵ポートレートの可視率
  let enemyVisibleRatioAtHand = null
  if (av) {
    const topAbs = av.top + window.scrollY
    const bottomAbs = av.bottom + window.scrollY
    const visTop = Math.max(topAbs, scrollForHand)
    const visBottom = Math.min(bottomAbs, scrollForHand + vh)
    enemyVisibleRatioAtHand = Math.max(0, Math.round(((visBottom - visTop) / (bottomAbs - topAbs)) * 100))
  }
  // 同じ位置で敵HP・Intent が見えるか
  const visibleAt = (sel, scrollY) => {
    const e = el(sel)
    if (!e) return null
    const b = e.getBoundingClientRect()
    const topAbs = b.top + window.scrollY
    const bottomAbs = b.bottom + window.scrollY
    return topAbs >= scrollY - 1 && bottomAbs <= scrollY + vh + 1
  }
  // 固定要素と手札の重なり
  let endOverlapsHand = false
  if (endRect && handRect && getComputedStyle(endBtn).position === 'fixed') {
    const handTopV = handRect.top
    const handBottomV = handRect.bottom
    endOverlapsHand = endRect.bottom > handTopV && endRect.top < handBottomV && endRect.right > handRect.left && endRect.left < handRect.right
  }
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    docHeight,
    overflowX: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
    battle: r('.battle'),
    topbar: r('.battle-topbar'),
    arena: r('.battle-main'),
    enemyPanel: r('.enemy-panel'),
    enemyStage: r('.enemy-stage'),
    enemyAvatar: r('.enemy-avatar'),
    enemyHp: r('.enemy-panel .hp-bar'),
    intent: r('.enemy-panel .intent'),
    allyRow: r('.ally-row'),
    playerPanel: r('.player-panel'),
    playerAvatar: r('.player-avatar'),
    playerHp: r('.player-panel .hp-bar'),
    otomoPanel: r('.god-otomo-panel'),
    resonance: r('.resonance-gauge'),
    burstPreview: r('.burst-preview'),
    hud: r('.battle-hud'),
    hand: r('.hand'),
    card: cards[0] ?? null,
    cardCount: cards.length,
    divination: r('.divination-panel'),
    endRound: r('.end-round-button'),
    log: r('.battle-log'),
    scrollForHand,
    enemyVisibleRatioAtHand,
    enemyHpVisibleAtHand: visibleAt('.enemy-panel .hp-bar', scrollForHand),
    intentVisibleAtHand: visibleAt('.enemy-panel .intent', scrollForHand),
    apVisibleAtHand: visibleAt('.battle-topbar', scrollForHand),
    endOverlapsHand,
  }
}

/** 指定スクロール位置での「見えているか」を、実際にスクロールしてから測る */
const VISIBILITY = (scrollY) => {
  window.scrollTo(0, scrollY)
  const vh = window.innerHeight
  // 固定要素（ドック・託宣バー・ラウンド終了）に覆われた領域は「見えていない」として扱う
  const covers = ['.hand', '.divination-panel', '.end-round-button', '.battle-hud']
    .map((sel) => document.querySelector(sel))
    .filter((el) => el && (getComputedStyle(el).position === 'fixed' || getComputedStyle(el).position === 'sticky'))
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
  const clipRect = (el) => {
    let top = 0
    let bottom = vh
    let node = el.parentElement
    while (node && node !== document.body) {
      const cs = getComputedStyle(node)
      if (cs.overflow !== 'visible' || cs.overflowY !== 'visible') {
        const r = node.getBoundingClientRect()
        top = Math.max(top, r.top)
        bottom = Math.min(bottom, r.bottom)
      }
      node = node.parentElement
    }
    return { top, bottom }
  }
  const ratio = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    const clip = clipRect(el)
    if (b.height <= 0) return null
    const others = covers.filter((c) => c.el !== el && !el.contains(c.el) && !c.el.contains(el))
    const top = Math.max(b.top, 0, clip.top)
    const bottom = Math.min(b.bottom, vh, clip.bottom)
    if (bottom <= top) return 0
    // 縦方向を 1px ずつ見て、どのドックにも覆われていない行の割合を出す（横は重なり幅で判定）
    let visibleRows = 0
    const rows = Math.max(1, Math.round(bottom - top))
    for (let i = 0; i < rows; i++) {
      const y = top + i + 0.5
      const coveredWidth = others.reduce((acc, { rect: c }) => {
        if (y < c.top || y > c.bottom) return acc
        const ov = Math.max(0, Math.min(b.right, c.right) - Math.max(b.left, c.left))
        return Math.max(acc, ov)
      }, 0)
      if (coveredWidth < b.width * 0.6) visibleRows++
    }
    return Math.round((visibleRows / Math.max(1, Math.round(b.height))) * 100)
  }
  const fully = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    return b.top >= -1 && b.bottom <= vh + 1
  }
  const cards = [...document.querySelectorAll('.hand .card-view')]
  const endBtn = document.querySelector('.end-round-button')
  const endRect = endBtn ? endBtn.getBoundingClientRect() : null
  return {
    scrollY: Math.round(window.scrollY),
    enemyAvatar: ratio('.enemy-avatar'),
    enemyHp: ratio('.enemy-panel .hp-bar'),
    intent: ratio('.enemy-panel .intent'),
    playerAvatar: ratio('.player-avatar'),
    playerHp: ratio('.player-panel .hp-bar'),
    resonance: ratio('.resonance-gauge'),
    topbar: ratio('.battle-topbar'),
    stickyHud: ratio('.battle-hud'),
    divination: ratio('.divination-panel'),
    cardsFullyVisible: cards.filter((c) => {
      const b = c.getBoundingClientRect()
      return b.top >= -1 && b.bottom <= vh + 1
    }).length,
    cardsTotal: cards.length,
    endRoundVisible: fully('.end-round-button'),
    clipped: (() => {
      const a = document.querySelector('.battle-main')
      if (!a) return null
      return { scrollH: a.scrollHeight, clientH: a.clientHeight, overflow: Math.max(0, a.scrollHeight - a.clientHeight) }
    })(),
    parts: Object.fromEntries(
      ['.enemy-panel', '.ally-row', '.player-panel', '.god-otomo-panel', '.battle-main', '.battle-topbar', '.battle-hud', '.divination-panel', '.hand']
        .map((sel) => {
          const el = document.querySelector(sel)
          return [sel, el ? Math.round(el.getBoundingClientRect().height) : null]
        }),
    ),
    endOverlapsCards: endRect
      ? cards.some((c) => {
          const b = c.getBoundingClientRect()
          return endRect.bottom > b.top && endRect.top < b.bottom && endRect.right > b.left && endRect.left < b.right
        })
      : null,
  }
}

const browser = await chromium.launch({ headless: true })

async function boot(page, url) {
  await page.goto(base + '/' + url)
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  const click = (t) =>
    page.evaluate((text) => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
      if (!b) return false
      b.click()
      return true
    }, t)
  await click('わかった')
  await page.waitForTimeout(200)
  await click('神を選ぶ')
  await page.waitForTimeout(350)
  if (await click('新しく始める')) await page.waitForTimeout(350)
  await click('大耀')
  await page.waitForTimeout(300)
  await click('この構成で始める')
  await page.waitForTimeout(300)
  await click('業斧の鬼将')
  await page.waitForTimeout(450)
  await click('この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 10000 })
  await page.waitForTimeout(1900)
}

const results = []
for (const vp of VIEWPORTS) {
  for (const [name, css] of Object.entries(CANDIDATES)) {
    if (only && !only.includes(name)) continue
    // スマホ幅では候補の CSS（min-width:900px 内）は効かないので、current 相当として1回だけ測る
    const mobile = vp.width < 900
    if (mobile && !(name === 'current' || name === 'P6' || name === 'P7')) continue
    if (!mobile && (name === 'M1' || name === 'M2' || name === 'M3')) continue
    if (!mobile && (name === 'A' || name === 'B' || name === 'C' || name === 'D' || name === 'D2' || name === 'P' || name === 'P2' || name === 'P3' || name === 'D3' || name === 'P4' || name === 'P5')) continue
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await boot(page, '?enemy=oni&stake=2&seed=p6b-layout')
    if (css) {
      const chrome = await page.evaluate(() => {
        const b = document.querySelector('.battle')
        if (!b) return 108
        const top = b.getBoundingClientRect().top + window.scrollY
        const parentPad = parseFloat(getComputedStyle(b.parentElement).paddingBottom || '0')
        return Math.round(top + parentPad + 8)
      })
      await page.addStyleTag({ content: ':root { --app-chrome: ' + chrome + 'px; }' })
      await page.addStyleTag({ content: css })
    }
    await page.waitForTimeout(400)
    const m = await page.evaluate(MEASURE)
    const atTop = await page.evaluate(VISIBILITY, 0)
    await page.waitForTimeout(120)
    const atHand = await page.evaluate(VISIBILITY, m.scrollForHand)
    await page.waitForTimeout(120)
    await page.evaluate(() => window.scrollTo(0, 0))
    if (shotsDir) {
      await page.screenshot({ path: join(shotsDir, `${vp.id}-${name}-top.png`) })
      if (m.scrollForHand > 0) {
        await page.evaluate((y) => window.scrollTo(0, y), m.scrollForHand)
        await page.waitForTimeout(200)
        await page.screenshot({ path: join(shotsDir, `${vp.id}-${name}-hand.png`) })
      }
    }
    results.push({ viewport: vp.id, label: vp.label, candidate: name, ...m, atTop, atHand, errors })
    console.log(
      `${vp.id} ${name}: doc=${m.docHeight} arena=${m.arena?.h} card=${m.card?.h}x${m.card?.w} scroll=${m.scrollForHand} | enemy=${atHand.enemyAvatar}% ehp=${atHand.enemyHp}% intent=${atHand.intent}%(${m.intent?.fontSize}) php=${atHand.playerHp}% res=${atHand.resonance}% div=${atHand.divination}% cards=${atHand.cardsFullyVisible}/${atHand.cardsTotal} end=${atHand.endRoundVisible} overlap=${atHand.endOverlapsCards} | overflowX=${m.overflowX} clip=${atHand.clipped?.overflow}`,
    )
    await ctx.close()
  }
}
await browser.close()
if (out) writeFileSync(out, JSON.stringify(results, null, 1))
