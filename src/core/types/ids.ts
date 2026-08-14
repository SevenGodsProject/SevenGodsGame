/**
 * ID の型定義。
 *
 * 中身はただの文字列ですが、種類ごとに別の型として扱えるようにしています。
 * こうすると「カードIDを入れるべき場所に神IDを入れた」といったミスが
 * 実行前にエディタ上で赤線として分かります。
 *
 * 命名規約:
 *   card_common_attack_01 / card_god01_oracle_01
 *   神: ebisu, taiyo, sobi, saika, juraku, fukuei, shouren（決定18：SGG Creator Kit準拠）
 *   OTOMO: taimaru, kozuchi, momokatsu, kotone, juka, haku, shofuku（神と1対1）
 *   enemy_01
 */

export type CardDefId = string & { readonly __idType: 'CardDefId' }
export type CardUid = string & { readonly __idType: 'CardUid' }
export type GodId = string & { readonly __idType: 'GodId' }
export type OtomoId = string & { readonly __idType: 'OtomoId' }
export type EnemyId = string & { readonly __idType: 'EnemyId' }

/** 文字列を CardDefId として扱う（データ定義時に使う） */
export const cardDefId = (value: string): CardDefId => value as CardDefId
export const cardUid = (value: string): CardUid => value as CardUid
export const godId = (value: string): GodId => value as GodId
export const otomoId = (value: string): OtomoId => value as OtomoId
export const enemyId = (value: string): EnemyId => value as EnemyId
