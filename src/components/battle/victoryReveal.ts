/**
 * 決定226 Victory Reveal v1：結果画面の段階表示を tap で全表示にするか（表示専用の判定）。
 * ボタン・リンク・折りたたみ等を押したときはその操作だけを行い、段階表示の skip には使わない
 * （再戦・次へ・報酬が勝手に発火しないように）。
 */
export function isStagedSkipTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false
  return !(target as Element).closest('button, a, summary, details, input, textarea, select, label')
}
