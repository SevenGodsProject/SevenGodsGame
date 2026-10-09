/**
 * CM-01 Public Face Pack v1：アプリ内の version 表示。
 *
 * - `__APP_VERSION__`＝`package.json` の version、`__BUILD_SHA__`＝ビルド時の短い commit sha
 *   （Vercel の `VERCEL_GIT_COMMIT_SHA` → `VITE_COMMIT_SHA` → ローカル git の順。無ければ `local`）。
 *   どちらも `vite.config.ts` の `define` が文字列リテラルに置き換える（実行時の環境変数は読まない）
 * - Home の隅と Feedback の本文に載せる。ゲームの規則・保存・リプレイ（`gameVersion.ts`）には使わない
 *   （あちらは「ルールの版」、こちらは「配信物の版」。混ぜない）
 * - define が無い環境（単体テストの一部・型検査）でも落ちないよう `typeof` で守る
 */
declare const __APP_VERSION__: string | undefined
declare const __BUILD_SHA__: string | undefined

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev'
export const BUILD_SHA: string = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'dev'

/** 表示用 1 行（例：`v1.0.0-rc.1 (6c8b226)`） */
export function buildLabel(): string {
  return `v${APP_VERSION} (${BUILD_SHA})`
}
