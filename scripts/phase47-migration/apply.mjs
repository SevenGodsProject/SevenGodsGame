#!/usr/bin/env node
/**
 * Phase 4.7 → 次Gate用：Neon への migration 適用ツール。
 *
 * ★安全弁
 *   - `--apply` を付けない限り DDL を実行しない（既定は preflight のみ）
 *   - preflight に ok=false が1つでもあれば適用しない（exit 2）
 *   - state が MIGRATED なら no-op（exit 0）。NOT_MIGRATED のときだけ適用する
 *   - 接続文字列は環境変数 `RANKING_DATABASE_URL` からのみ読み、**一切出力しない**
 *   - エラーメッセージは接続文字列・ホスト名を伏字にしてから出す
 *
 * ★使い方（すべて読み取りのみ）
 *   node scripts/phase47-migration/apply.mjs                # preflight のみ
 *   node scripts/phase47-migration/apply.mjs --postflight   # postflight のみ
 *
 * ★適用（CEO承認後の次Gateでのみ実行する）
 *   node scripts/phase47-migration/apply.mjs --apply
 *     → preflight → 適用 → postflight を連続実行し、途中で止まれば非0で終了する
 *
 * ★実行方式
 *   Neon の HTTP ドライバは複数文を1回で流せないため、`statements.json`（1文ずつ）を使う。
 *   まず `sql.transaction([...])` で1トランザクションにまとめて試み、ドライバがそれを
 *   受け付けない場合は1文ずつ流す（migration は冪等なので、途中で止まっても再実行で収束する）。
 *   transaction 経路の実機挙動は Neon で未検証（Dry Run は PGlite）。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const read = (name) => readFileSync(path.join(here, 'sql', name), 'utf8')

const args = new Set(process.argv.slice(2))
const APPLY = args.has('--apply')
const POSTFLIGHT_ONLY = args.has('--postflight')

const url = process.env.RANKING_DATABASE_URL
if (!url) {
  console.error('RANKING_DATABASE_URL が設定されていません（値はこのツールから出力されません）')
  process.exit(1)
}

/** 出力から接続情報を消す */
function redact(text) {
  let out = String(text).split(url).join('<REDACTED>')
  out = out.replace(/postgres(?:ql)?:\/\/\S+/gi, '<REDACTED>')
  out = out.replace(/ep-[a-z0-9-]+\.[a-z0-9.-]*neon\.tech/gi, '<REDACTED-HOST>')
  return out
}

function printChecks(title, rows) {
  console.log(`\n== ${title} ==`)
  for (const r of rows) {
    console.log(`${r.ok ? 'ok  ' : 'NG  '} ${r.check_name.padEnd(34)} ${String(r.value ?? '')}${r.note ? '   -- ' + r.note : ''}`)
  }
  const bad = rows.filter((r) => !r.ok)
  console.log(bad.length === 0 ? '→ すべて ok' : `→ ${bad.length} 件が NG`)
  return bad.length === 0
}

async function main() {
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(url)
  const q = async (text) => sql.query(text)

  if (POSTFLIGHT_ONLY) {
    const ok = printChecks('postflight', await q(read('postflight.sql')))
    process.exit(ok ? 0 : 3)
  }

  const pre = await q(read('preflight.sql'))
  const preOk = printChecks('preflight', pre)
  const state = pre.find((r) => r.check_name === 'migration_state')?.value
  if (!preOk) {
    console.log('\npreflight が NG のため適用しません（STOP）')
    process.exit(2)
  }
  if (!APPLY) {
    console.log(`\nstate=${state}。適用するには --apply を付けて実行してください（CEO承認後）`)
    process.exit(0)
  }
  if (state === 'MIGRATED') {
    console.log('\n既に適用済みです（no-op）')
    const ok = printChecks('postflight', await q(read('postflight.sql')))
    process.exit(ok ? 0 : 3)
  }
  if (state !== 'NOT_MIGRATED') {
    console.log(`\nstate=${state} は自動適用の対象外です。人が状態を確認してください（STOP）`)
    process.exit(2)
  }

  const statements = JSON.parse(read('001_phase46_tickets.statements.json'))
  console.log(`\n== apply: ${statements.length} statements ==`)
  let mode = 'transaction'
  try {
    await sql.transaction(statements.map((s) => sql.query(s)))
  } catch (error) {
    // ドライバが transaction([...]) を受け付けない場合だけ1文ずつへ切り替える。
    // DBが返したエラー（制約・権限・存在しない列など）はそのまま止める
    const message = redact(error?.message ?? error)
    if (!/transaction|not a function|NeonQueryPromise|array/i.test(message)) {
      console.error('適用に失敗しました:', message)
      process.exit(4)
    }
    mode = 'sequential'
    console.log('transaction 経路が使えないため1文ずつ流します:', message)
    for (const [i, s] of statements.entries()) {
      try {
        await q(s)
        console.log(`  [${i + 1}/${statements.length}] ok`)
      } catch (e) {
        console.error(`  [${i + 1}/${statements.length}] 失敗:`, redact(e?.message ?? e))
        console.error('冪等なので、原因を取り除いたあと同じコマンドを再実行してください')
        process.exit(4)
      }
    }
  }
  console.log(`適用完了（${mode}）`)

  const ok = printChecks('postflight', await q(read('postflight.sql')))
  if (!ok) {
    console.log('\npostflight が NG です。Production API を開かないでください')
    process.exit(3)
  }
  console.log('\npostflight すべて ok。次は実DB統合テスト（RUNBOOK.md 手順4）')
}

main().catch((error) => {
  console.error(redact(error?.message ?? error))
  process.exit(1)
})
