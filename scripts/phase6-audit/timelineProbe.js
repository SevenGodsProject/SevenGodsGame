/*
 * Phase 6 / 6-A 監査用：戦闘演出タイムラインの計測プローブ（ブラウザで eval して使う。ゲームコードではない）。
 *
 * 1 アクション（カード使用・託宣・ラウンド終了）ごとに、入力時刻を 0ms として
 * cast／impact／number／visualHpStart／visualHpEnd／defeatStart／defeatEnd／victory／reward を記録する。
 * - impact・number は「要素の mount 時刻＋CSS の animation-delay」＝実際に見え始める時刻
 * - visualHp は HP バー（.hp-bar-fill／.hp-bar-ghost）の width 変化時刻と、
 *   その要素の transition-delay＋transition-duration から求める終了時刻
 * Before（RC）・After（6-A）の両方のDOMを同じ規則で測れるよう、クラス名は両方を見る。
 *
 * 使い方（DevTools / 自動化）：
 *   eval(src); window.__tl.run(label, () => clickSomething()) → Promise<row>
 */
;(() => {
  const ms = (v) => {
    const s = String(v || '0s').split(',')[0].trim()
    return s.endsWith('ms') ? parseFloat(s) : (parseFloat(s) || 0) * 1000
  }
  const cls = (n) => (typeof n.className === 'string' ? n.className : '')
  window.__tl = {
    run(label, act, waitMs = 4200) {
      const t0 = performance.now()
      const now = () => Math.round(performance.now() - t0)
      const row = { label }
      const setMin = (k, v) => {
        if (row[k] == null || v < row[k]) row[k] = Math.round(v)
      }
      const setMax = (k, v) => {
        if (row[k] == null || v > row[k]) row[k] = Math.round(v)
      }
      const inspect = (n) => {
        if (!(n instanceof Element)) return
        const c = cls(n)
        const cs = getComputedStyle(n)
        if (/\bcast-flash\b/.test(c)) setMin('cast', now())
        const inEnemy = !!n.closest('.enemy-panel')
        const inPlayer = !!n.closest('.player-panel')
        // impact：Before＝HPラッパーのhit-shake-flash、After＝敵立ち絵のリアクション
        if (inEnemy && /(hit-shake-flash|enemy-reaction)/.test(c) && cs.animationName !== 'none') setMin('impact', now() + ms(cs.animationDelay))
        if (inPlayer && /(hit-shake-flash|hit-shake-multi)/.test(c) && cs.animationName !== 'none') setMin('impactSelf', now() + ms(cs.animationDelay))
        if (/\bfloating-number\b/.test(c) && /damage/.test(c)) {
          const at = now() + ms(n.style.animationDelay || cs.animationDelay)
          if (inEnemy) setMin('number', at)
          else setMin('numberSelf', at)
        }
        if (/\benemy-defeat\b/.test(c)) {
          setMin('defeatStart', now() + ms(cs.animationDelay))
          setMax('defeatEnd', now() + ms(cs.animationDelay) + ms(cs.animationDuration))
        }
        if (/\bvictory-beat\b/.test(c)) setMin('victory', now())
        if (/\breward-overlay\b/.test(c)) {
          // 一瞬だけ mount されて消えるケースがあるため、最初と最後（＝見え続ける方）を分けて記録する
          setMin('rewardFirst', now())
          setMax('reward', now())
        }
        if (/\bgame-over-overlay\b/.test(c)) setMin('result', now())
        if (/\bfloating-number-block\b/.test(c)) setMin('guardNumber', now() + ms(n.style.animationDelay || cs.animationDelay))
        if (/\benemy-lunge/.test(c)) setMin('enemyLunge', now())
        if (/\bresonance-cutin\b/.test(c)) setMin('cutin', now())
        if (/\bburst-banner\b/.test(c)) setMin('burstBanner', now())
        if (/\bresult-toast\b/.test(c)) setMin('toast', now() + ms(cs.animationDelay))
      }
      const hpChange = (n) => {
        const c = cls(n)
        if (!/hp-bar-(fill|ghost)/.test(c)) return
        const who = n.closest('.enemy-panel') ? '' : n.closest('.player-panel') ? 'Self' : null
        if (who === null) return
        const cs = getComputedStyle(n)
        const t = now()
        if (/hp-bar-fill/.test(c)) setMin('visualHpStart' + who, t + ms(cs.transitionDelay))
        setMax('visualHpEnd' + who, t + ms(cs.transitionDelay) + ms(cs.transitionDuration))
      }
      const mo = new MutationObserver((list) => {
        for (const m of list) {
          if (m.type === 'childList') {
            for (const a of m.addedNodes) {
              if (!(a instanceof Element)) continue
              inspect(a)
              a.querySelectorAll('*').forEach(inspect)
            }
          } else if (m.type === 'attributes') {
            if (m.attributeName === 'style') hpChange(m.target)
            if (m.attributeName === 'class') inspect(m.target)
          }
        }
      })
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] })
      row.input = 0
      act()
      return new Promise((resolve) =>
        setTimeout(() => {
          mo.disconnect()
          resolve(row)
        }, waitMs),
      )
    },
  }
})()
