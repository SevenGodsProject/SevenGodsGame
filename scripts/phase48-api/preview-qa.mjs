#!/usr/bin/env node
/**
 * Phase 4.8：Preview QA ランナー。
 *
 * Preview deployment の URL に対して、Production API の契約を上から順に確かめる。
 * 手でcurlを20回叩く代わりに、これ1本で「どの段階まで開いているか」が分かる。
 *
 * 使い方：
 *   node scripts/phase48-api/preview-qa.mjs --base-url https://<preview>.vercel.app
 *   node scripts/phase48-api/preview-qa.mjs --base-url <url> --stage closed
 *
 * stage（既定は auto：応答を見て自動判定）
 *   closed  … 環境変数を入れる前。3本とも 503 api_disabled であること
 *   read    … RANKING_API_ENABLED + 接続文字列を入れた後。leaderboard だけ通ること
 *   full    … RANKING_PREVIEW_UNLOCK も入れた後。start→submit→leaderboard が回ること
 *
 * ★秘密は出力しない
 * identity はこのスクリプトが毎回その場で作る。playerSecret は画面にもファイルにも出さない。
 * 接続文字列はそもそも受け取らない（サーバー側の環境変数だけで完結する）。
 *
 * ★このスクリプトはDBを消さない
 * Preview で作られた ticket / run は、Phase 4.6 の剪定（`pruneBefore`）と
 * `daily_days` の CASCADE で自然に片付く。DELETE は一切発行しない。
 */

const args = process.argv.slice(2)
function arg(name, fallback = null) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const BASE = (arg('base-url') ?? '').replace(/\/+$/, '')
const STAGE = arg('stage', 'auto')

if (!BASE) {
  console.error('使い方: node scripts/phase48-api/preview-qa.mjs --base-url https://<preview>.vercel.app [--stage closed|read|full]')
  process.exit(2)
}
if (!['auto', 'closed', 'read', 'full'].includes(STAGE)) {
  console.error(`--stage は closed / read / full / auto のいずれか（受け取った値: ${STAGE}）`)
  process.exit(2)
}

/** その日のJSTの日付キー。サーバーと同じ規則（rules.daily.timezoneOffsetMinutes = 540） */
function dailyKeyOf(now = new Date()) {
  const shifted = new Date(now.getTime() + 540 * 60_000)
  return shifted.toISOString().slice(0, 10)
}

/** 端末が持つ秘密と、そこから導く公開ID（サーバーと同じ導出） */
async function makeIdentity() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const playerSecret = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(playerSecret))
  const playerId = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
  return { playerId, playerSecret }
}

function newRunId() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const results = []
let identity = null

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  const mark = ok ? 'ok  ' : 'NG  '
  console.log(`${mark} ${name}${detail ? `   -- ${detail}` : ''}`)
}

/** 応答を読む。本文は秘密が無いことを確かめてから、要点だけ返す */
async function call(method, path, { body, headers } = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(headers ?? {}) },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
  } catch (error) {
    // 到達できない（URLが違う・deploy がまだ・ネットワーク断）。
    // ここで落とさず、検査項目として NG を積み上げたほうが原因が分かりやすい
    return {
      status: 0,
      json: null,
      text: '',
      headers: new Headers(),
      unreachable: error instanceof Error ? error.name : 'unknown',
    }
  }
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // HTMLが返ってきた等。error に形を残す（中身は出さない）
  }
  return { status: response.status, json, text, headers: response.headers }
}

/** 応答のどこにも秘密が出ていないこと */
function assertNoSecret(name, response) {
  const leaked =
    response.text.includes(identity.playerSecret) ||
    /playersecret/i.test(response.text) ||
    [...response.headers].some(([, v]) => v.includes(identity.playerSecret))
  record(`${name}: 秘密が応答に出ていない`, !leaked)
}

function expectStatus(name, response, expected, expectedError) {
  if (response.unreachable) {
    record(name, false, `到達できません（${response.unreachable}）— base-url と deploy の状態を確認してください`)
    return false
  }
  const okStatus = response.status === expected
  const okError = expectedError === undefined || response.json?.error === expectedError
  record(
    name,
    okStatus && okError,
    `status=${response.status}${response.json?.error ? ` error=${response.json.error}` : ''}${
      okStatus && okError ? '' : ` （期待 ${expected}${expectedError ? ` / ${expectedError}` : ''}）`
    }`,
  )
  return okStatus && okError
}

// --- 段階の自動判定 ---------------------------------------------------------

async function detectStage() {
  const probe = await call('GET', `/api/ranking/leaderboard?dailyKey=${dailyKeyOf()}`)
  if (probe.json?.error === 'api_disabled') return 'closed'
  if (probe.json?.error === 'database_unconfigured') return 'closed'
  if (probe.status !== 200) return 'closed'
  const start = await call('POST', '/api/ranking/start', {
    body: { ...identity, clientRunId: newRunId() },
  })
  return start.json?.error === 'submission_disabled' ? 'read' : 'full'
}

// --- 検査 -------------------------------------------------------------------

async function checkClosed() {
  console.log('\n== stage: closed（環境変数を入れる前）==')
  for (const [method, path, body] of [
    ['POST', '/api/ranking/start', { ...identity, clientRunId: newRunId() }],
    ['POST', '/api/ranking/submit', { ...identity, clientRunId: newRunId(), input: {} }],
    ['GET', `/api/ranking/leaderboard?dailyKey=${dailyKeyOf()}`, undefined],
  ]) {
    const response = await call(method, path, { body })
    expectStatus(`${method} ${path.split('?')[0]} が閉じている`, response, 503, 'api_disabled')
  }
}

/** 段階に依らず成り立つべき leaderboard / メソッドの契約 */
async function checkContract() {
  const key = dailyKeyOf()

  const board = await call('GET', `/api/ranking/leaderboard?dailyKey=${key}`)
  expectStatus('leaderboard が読める', board, 200)
  record(
    'leaderboard にキャッシュ猶予が付く',
    (board.headers.get('cache-control') ?? '').includes('s-maxage='),
    board.headers.get('cache-control') ?? '(なし)',
  )
  record('leaderboard の本文が JSON', board.json !== null && typeof board.json === 'object')

  for (const bad of ['', 'yesterday', '2026-13-40']) {
    const response = await call('GET', `/api/ranking/leaderboard?dailyKey=${bad}`)
    expectStatus(`不正な dailyKey（${bad || '空'}）は 400`, response, 400, 'bad_daily_key')
  }

  const wrongMethod = await call('GET', '/api/ranking/start')
  expectStatus('メソッド違いは 405', wrongMethod, 405, 'method_not_allowed')
}

async function checkRead() {
  console.log('\n== stage: read（API は開き、kill switch は閉じたまま）==')
  await checkContract()

  const start = await call('POST', '/api/ranking/start', {
    body: { ...identity, clientRunId: newRunId() },
  })
  expectStatus('start は kill switch で止まる', start, 503, 'submission_disabled')
  assertNoSecret('start', start)

  const submit = await call('POST', '/api/ranking/submit', {
    body: { ...identity, clientRunId: newRunId(), input: {} },
  })
  expectStatus('submit は kill switch で止まる', submit, 503, 'submission_disabled')
}

async function checkFull() {
  console.log('\n== stage: full（Preview だけ kill switch を開けた状態）==')
  const key = dailyKeyOf()
  const runIds = [newRunId(), newRunId(), newRunId(), newRunId()]

  // 1回目：新規発行
  const first = await call('POST', '/api/ranking/start', {
    body: { ...identity, clientRunId: runIds[0] },
  })
  const started = expectStatus('start（1回目）が 201', first, 201)
  assertNoSecret('start', first)
  if (started) {
    record('attemptNo が 1', first.json?.attemptNo === 1, `attemptNo=${first.json?.attemptNo}`)
    record('dailyKey をサーバーが決めている', first.json?.dailyKey === key, `dailyKey=${first.json?.dailyKey}`)
    record('attemptsPerDay が 3', first.json?.attemptsPerDay === 3, `${first.json?.attemptsPerDay}`)
    record('gameVersion が返る', typeof first.json?.gameVersion === 'string', first.json?.gameVersion)
  }

  // 同じ clientRunId は冪等（枠を食わない）
  const again = await call('POST', '/api/ranking/start', {
    body: { ...identity, clientRunId: runIds[0] },
  })
  expectStatus('同じ clientRunId の再送は 200（冪等）', again, 200)
  record('reused=true', again.json?.reused === true, `reused=${again.json?.reused}`)

  // 身元が合わない提出は弾かれる
  const wrongSecret = await call('POST', '/api/ranking/start', {
    body: { playerId: identity.playerId, playerSecret: 'f'.repeat(64), clientRunId: newRunId() },
  })
  expectStatus('他人の playerId を名乗る start は 400', wrongSecret, 400, 'BAD_IDENTITY')

  // ticket 無しの提出は通らない
  const noTicket = await call('POST', '/api/ranking/submit', {
    body: { ...identity, clientRunId: newRunId(), input: { version: 1, mode: 'daily', dailyKey: key, godId: 'ebisu', deck: [], actions: [] } },
  })
  record(
    'ticket 無しの submit は受理されない',
    noTicket.status >= 400,
    `status=${noTicket.status} error=${noTicket.json?.error ?? '-'}`,
  )

  // 大きすぎる body
  const huge = await call('POST', '/api/ranking/submit', { body: `{"junk":"${'x'.repeat(70000)}"}` })
  expectStatus('64KB を超える body は 413', huge, 413, 'payload_too_large')

  // 壊れた JSON
  const broken = await call('POST', '/api/ranking/start', { body: '{"playerId":' })
  expectStatus('壊れた JSON は 400', broken, 400, 'bad_request')

  // 3回勝負：残り2枠を取り、4回目は断られる
  for (let i = 1; i <= 2; i++) {
    const response = await call('POST', '/api/ranking/start', {
      body: { ...identity, clientRunId: runIds[i] },
    })
    expectStatus(`start（${i + 1}回目）が 201`, response, 201)
  }
  const fourth = await call('POST', '/api/ranking/start', {
    body: { ...identity, clientRunId: runIds[3] },
  })
  expectStatus('4回目の start は 409（1日3回）', fourth, 409, 'ATTEMPTS_EXCEEDED')

  const board = await call('GET', `/api/ranking/leaderboard?dailyKey=${key}&playerId=${identity.playerId}`)
  expectStatus('leaderboard が読める', board, 200)
  assertNoSecret('leaderboard', board)
  record(
    'leaderboard は URL に秘密を要求しない',
    !board.text.includes(identity.playerSecret),
  )
}

// --- 実行 -------------------------------------------------------------------

async function main() {
  identity = await makeIdentity()
  console.log(`base-url : ${BASE}`)
  console.log(`dailyKey : ${dailyKeyOf()}`)
  console.log(`playerId : ${identity.playerId}（秘密は出力しません）`)

  const stage = STAGE === 'auto' ? await detectStage() : STAGE
  if (STAGE === 'auto') console.log(`検出した段階: ${stage}`)

  if (stage === 'closed') await checkClosed()
  if (stage === 'read') await checkRead()
  if (stage === 'full') {
    console.log('\n== 段階に依らない契約 ==')
    await checkContract()
    await checkFull()
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} ok`)
  if (failed.length > 0) {
    console.log('NG:')
    for (const f of failed) console.log(`  - ${f.name}`)
  }
  // ★`process.exit()` を使わない。
  // fetch の keep-alive ソケットが残ったまま強制終了すると、Windows の libuv が
  // アサートで落ち、終了コードが 127 になってしまう（＝QAの成否が読めなくなる）。
  // 終了コードだけ立てて、イベントループが空になるのを待つ。
  process.exitCode = failed.length === 0 ? 0 : 1
}

main().catch((error) => {
  // 接続先の情報を含みうるので、例外の名前だけを出す
  console.error('QA ランナーが失敗しました:', error instanceof Error ? error.name : typeof error)
  process.exitCode = 3
})
