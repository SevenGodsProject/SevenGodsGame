/**
 * Legal／Credits 画面の文言（CM-02／03）。**画面に出る文字列はこのファイルだけ**に置く
 * （`creditsScreen.test.ts` が禁止語・必須語をここで固定する）。
 *
 * 採用方針（CEO 指示 2026-10-09）：
 * - 非公式ファン作品であることを明示し、SGG 運営の公式・公認・提携作品と誤認させない
 * - Creator Kit 素材の出典を表示する
 * - BGM・SE・生成 AI 素材は「確認済みの制作事実」だけを書く（Rights Ledger の UNKNOWN-ACCEPTED を
 *   「権利クリア」「許諾済み」とは書かない）
 * - Kit 配布の音声（大耀「あいさつ」1 本・feat/official-voice-pilot-v1）は統合済み＝素材 1 行目で「大耀の音声」と限定して事実だけ書く
 *   （「公式ボイス」「公式の声」の語は使わない。Kit §5 の「公式」は Kit 配布分の説明であり、本作の表示で公式性を示唆しない）
 * - 配信元（Vercel）のアクセス記録があるため「外部送信なし」と断定しない
 * - 問い合わせ先は未確定（「準備中」）。本作の問い合わせを SGG 運営へ送らないよう 1 文添える
 * - 権利条件の未解決事項（生成記録が揃っていない素材＝Rights Ledger の UNKNOWN-ACCEPTED）は隠さず、制作者の責任で使用している事実を書く
 * - 制作者名は SGG 運営とは別の個人制作スタジオであることを括弧書きで示す（なりすまし・関係者と誤認させない）
 * - 文言の最終確認は CEO（`docs/LEGAL_CREDITS_SCREEN_V1.md` §2 の表で 1 文ずつ状態を管理。§2-2 の確定候補を CEO が 2026-10-10 に条件付き承認）
 */
export const CREDITS_TITLE = 'クレジット・権利表記'

export const CREDITS_LEAD =
  '本作「SEVEN GODS：共鳴カードバトル」は、SEVENGODS（SGG）の二次創作ガイドラインに基づく非公式のファン作品です。SGG 運営による公式・公認・提携作品ではありません。'

export const CREDITS_SECTIONS: ReadonlyArray<{ heading: string; lines: ReadonlyArray<string> }> = [
  {
    heading: '素材について',
    lines: [
      '神と OTOMO の画像、および大耀の音声（あいさつ）は「SEVENGODS Games Creator Kit」の配布素材をそのまま使用しています（声の素材を本作で制作してはいません）。',
      'BGM は制作者が Suno で生成しました。効果音は制作者が合成して作成しました。',
      '敵・カード・背景などの一部の画像は、制作者が生成 AI を用いて作成しました。',
      '生成 AI で作成した素材の一部には、生成時の記録（利用プラン・生成日時など）が揃っていないものがあり、制作者の責任で使用しています。',
      'アイコンと SNS 用の画像は、上記の素材と自作の図形を組み合わせて作成しました。',
    ],
  },
  {
    heading: 'データの保存について',
    lines: [
      'ゲームの記録（戦績・デッキ・進行中のバトルなど）は、お使いの端末内（localStorage）に保存します。アカウント登録はありません。',
      'ゲーム自体がプレイデータを外部へ送信する仕組みは持っていません（配信元 Vercel の標準的なアクセス記録は除きます）。',
      'フィードバックの文章はクリップボードへコピーされるだけで、自動では送信されません。',
    ],
  },
  {
    heading: 'お問い合わせ',
    lines: ['問い合わせ先は準備中です。本作に関するお問い合わせを SGG 運営へ送ることはお控えください。'],
  },
]

/** 末尾のクレジット行（SGG ガイドライン §4 の書式 2 つ＋制作者） */
export const CREDITS_FOOTER_LINES: ReadonlyArray<string> = ['SEVENGODS（SGG）二次創作', 'SEVENGODS Games Creator Kit', '制作：SEVENDAO GAMES（SGG 運営とは別の個人制作スタジオです）']

/** Home のリンク文言 */
export const CREDITS_LINK_LABEL = 'クレジット・権利表記'
