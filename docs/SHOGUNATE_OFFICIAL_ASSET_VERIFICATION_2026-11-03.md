# 将軍家 公式 10 体・素材照合（2026-11-03・READ-ONLY）

> **状態：VERIFIED — 照合のみ。ダウンロード 0（画像は HTTP HEAD・3D は catalog／MCP の JSON のみ）／runtime・assets 変更 0／音声生成 0／有料 API 0／push・merge・deploy 0。** CEO 提供の情報（公式 ID 10 件・配布元 2 URL）を既存監査（`CREATOR_KIT_V1_1_AUDIT.md` §3・`SHOGUNATE_FACTION_DESIGN_V1.md` §1・`FINAL_SCOPE_ROADMAP_V1.md` §1・`OFFICIAL_ENEMY_VOICE_AUDIT_V1.md` §1）と突き合わせた結果。

## 1. 公式 ID の照合

CEO 提示：`yasutora / tadakatsu / naomasa / tadatsugu / yasumasa / onihanzo / kage / kunoichi / doman / okappiki`
→ repo の公式 manifest コピー（`docs/assets-kit/shogunate-manifest.json`・`kitVersion 1.0.0`・`releasedAt 2026-10-08`）の `characters[].id` と **順序まで完全一致**。3D Kit（workers.dev `/api/catalog` v0.3.0・MCP `search_characters family=SHOGUNATE`）の `characterId` とも一致（3D 側の id は `<characterId>-enemy`）。

## 2. 画像 16 点（2D Kit・`https://sevengodsgames.com/creator-kit/shogunate/v1/assets/`）

| 項目 | 結果 |
|---|---|
| 存在 | **16／16 が HTTP 200・`image/webp`**（HEAD。`Content-Length` は chunked のため無し＝サイズは manifest 非記載・未計測） |
| 形式・解像度 | manifest どおり **WEBP 1600×1600**（全点）。透過：FRONT 7・BACK 6＝`transparent: true`／MAIN 3（影・くノ一・岡っ引き）＝`transparent: false` |
| 同一性 | 各点に sha256 が manifest に記載（本書では忠次 FRONT のみ実体で検証：§4）。採用時は原本 DL → sha256 一致を台帳 Evidence に記す（忠次と同手順） |
| 使用条件 | `rights.termsId SGG-FAN-CREATION-GUIDELINES-1.0.0`。RIGHTS.md（公式サイト・workers.dev の 2 経路・**repo コピーと diff 0**・Updated 2026-10-08）：§2 加工と作品への組み込み **可**・商用 **可**・印税不要／§4 クレジット任意（3 書式）／§5 自作の声は自由・「公式」「公式ボイス」「公認」の表示禁止／§6 ほぼ未改変のまま素材として販売・再配布 **禁止**・公式／公認と誤認させる表示 **禁止**／§7 口調設定本文は配布対象外 |
| 本作での加工 | 余白トリム・リサイズ（768²）・webp 再エンコードの **非生成加工のみ**（忠次の前例＝規約 §2 内）。MAIN 3 点は非透過のため切り抜き（非生成）が必要＝`FINAL_SCOPE_ROADMAP_V1.md` §2-2 のとおり |

## 3. 3D Creator Kit（`https://sgg-creator-kit.svc-manage-2020.workers.dev/#library`）

| 項目 | 結果 |
|---|---|
| カタログ | `/api/catalog`：`version 0.3.0`・`termsVersion SGG-FAN-CREATION-GUIDELINES-1.0.0`・characters 38（GODS 7／OTOMO 21／SHOGUNATE 10）・available 38・**voiceClips 28** |
| 将軍家 10 体の 3D | 全 10 体 `status available`・GLB 各 **10.7〜11.8 MB（合計 106.6 MB）**・`rig none`・`bones 0`・`animations []`・notes「静止モデルです。動かす場合はリグやアニメーションの追加が必要です」・sha256 と URL あり（取得していない） |
| **公式音声** | **将軍家 10 体に `voice` フィールド無し**（GODS 7 体のみ 4 clip の `voice` 配列）。MCP `get_voice(tadatsugu-enemy)` → `NO_OFFICIAL_VOICE: Only the 7 GODS have official voices… Creators may make and use their own voices, but must not label them 公式, 公式ボイス, 公認`。MCP server instructions（v0.3.0）にも「OTOMO and SHOGUNATE have none」「Do not invent canon」 |
| 本作での扱い | 3D は **最終スコープ外**（本作は 2D 立ち絵・GLB 1 体 11 MB は Web 配信に不向き・静止モデルで演出価値が薄い）。`FINAL_SCOPE_ROADMAP_V1.md` §1 に明記 |

## 4. 既存 忠次 Pilot（`enemy_08`・v0.6・Production `10b0cd3`）との一致

| 項目 | 公式 | 本作 | 判定 |
|---|---|---|---|
| 名前・role | 忠次／将軍四天王 | `name: '将軍四天王・忠次'`（role＋名） | 一致（公式語のみで構成） |
| profile | 四天王で最も軍略に優れた軍師。勇猛さと知恵を兼ね備える。 | `typeLabel '軍略型'`・`typeDescription 'R4は傷が浅ければ総攻め。R3までに追い込め。'`（AI 創作・gameplay 説明） | 公式 profile と矛盾なし。**typeLabel／typeDescription は AI 創作**として区別 |
| 立ち絵 | `tadatsugu:FRONT` sha256 `b8d7d894e6b5301e…2586` | `art-source/enemies/tadatsugu/tadatsugu_front.webp` 138,730 B・**sha256 一致**（本日再計算）→ 配信 `public/assets/enemies/tadatsugu/art.webp` 57,326 B・VP8X 768×768（非生成加工・台帳 ENEMY-KIT-01） | 一致 |
| BACK・3D | `tadatsugu:BACK`・`tadatsugu-enemy.glb`（11,004,672 B） | 未使用・未取得 | 問題なし |
| 台詞・二つ名・技名 | **公式には存在しない** | `battleCries` 7 本・「軍略・総攻め」＝AI 仮文（CEO「暫定維持」） | 非公式として区別済み（コードコメント・台帳・Credits 予定） |
| ボイス | 公式無し（§3） | 未実装 → `OFFICIAL_ENEMY_VOICE_AUDIT_V1.md` の **非公式オリジナル AI ボイス案を維持** | 維持 |

## 5. 既存監査資料との差分

- `CREATOR_KIT_V1_1_AUDIT.md` §3-1（2026-10-09）・`SHOGUNATE_FACTION_DESIGN_V1.md` §1・`FINAL_SCOPE_ROADMAP_V1.md` §1 の記載（10 体・16 枚・FRONT 7／BACK 6／MAIN 3・ボイス無し）と **矛盾なし**。新事実は「3D は全 10 体 available・静止・各 11 MB」「catalog v0.3.0・voiceClips 28」の 2 点のみ
- `docs/assets-kit/SGG-CREATOR-KIT-RIGHTS.md` は公式最新版と **diff 0**（§5 を含む）。`CREATOR_KIT_V1_1_AUDIT.md` §5-2 #2「repo コピーは §5 を含まない旧版」は **解消済み**（v1.0.6 までに更新されていた）

## 6. 最終開発計画への反映

- `FINAL_SCOPE_ROADMAP_V1.md` §1 に本照合の要点（3D は対象外・公式音声なし・16 点 200）を追記（本 commit）
- 変更なし：6 wave・語彙の線引き・ボイス 7 場面・非公式オリジナル AI ボイス案・CEO 判断 4 件

## 7. 次の推奨作業

1. CEO：`docs/v1_0_6-live-record`（5 commit）の push → PR → merge（手順は既報）
2. CEO：`FINAL_SCOPE_ROADMAP_V1.md` §8 の 4 件（スコープ／音声サービスと予算／W1 開始／報告書形式）
3. AI（承認後）：W1 忠次 公開 v1 を branch で開始（★実測 Gate を含む）。並行して W2 用に **忠次 7 本の台本を CEO が試聴しやすい形**（1 行ずつ・尺・演技メモ）で確定
