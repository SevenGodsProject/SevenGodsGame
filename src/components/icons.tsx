/**
 * アプリ全体のヘッダーで使う共通アイコン（ミュート・遊び方）。
 *
 * `cardIcon.tsx`（決定30）と同じ方針で、外部アイコンライブラリは使わず
 * 手描きのSVGプリミティブで表現する。
 */

export function SpeakerIcon({ muted, className }: { muted: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M4 9v6h4l5 4V5L8 9H4Z"
        fill="currentColor"
      />
      {muted ? (
        <g stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M16 9l5 6M21 9l-5 6" />
        </g>
      ) : (
        <g stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" fill="none">
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 6a8.5 8.5 0 0 1 0 12" />
        </g>
      )}
    </svg>
  )
}

export function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" fill="none">
        <path d="M12 6.5C10.5 5.4 8 5 4.5 5v13c3.5 0 6 .4 7.5 1.5C13.5 18.4 16 18 19.5 18V5C16 5 13.5 5.4 12 6.5Z" />
        <path d="M12 6.5V19.5" />
      </g>
    </svg>
  )
}

/** Task C2：ホーム画面「OTOMOとの絆を見る」ボタン用のハートアイコン */
export function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-9.9-9.2C.6 8 2 4.8 5.3 4.1c2-.4 3.9.5 5 2.1a1 1 0 0 0 1.4 0c1.1-1.6 3-2.5 5-2.1 3.3.7 4.7 3.9 3.2 7.2C19.5 15.9 12 20.5 12 20.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Task E1：ホーム画面「戦績を見る」ボタン用のトロフィーアイコン */
export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
        <path d="M7 5H4.5a1 1 0 0 0-1 1.2C4 8.5 5.5 9.7 7 10" />
        <path d="M17 5h2.5a1 1 0 0 1 1 1.2C20 8.5 18.5 9.7 17 10" />
        <path d="M12 14v3" />
        <path d="M8.5 20.5h7" />
        <path d="M9.5 17.5c0 1.4 1 3 2.5 3s2.5-1.6 2.5-3" />
      </g>
    </svg>
  )
}

/** 実プレイ・フィードバック基盤：ヘッダーの「感想を送る」ボタン用の吹き出しアイコン */
export function FeedbackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M4 5.5h16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9.5L5 19.5V16H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="8.3" cy="10.7" r="1" fill="currentColor" />
      <circle cx="12" cy="10.7" r="1" fill="currentColor" />
      <circle cx="15.7" cy="10.7" r="1" fill="currentColor" />
    </svg>
  )
}
