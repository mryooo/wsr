# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**Abyss Alchemy** — ウォーターソートパズル+ローグライクのブラウザゲーム。Vanilla JS(ES6+)、ビルドプロセスなし、依存パッケージなし。Tailwind CSSはCDN読み込み。

## コマンド

ビルド・テストスイートは存在しない。

- **実行:** `index.html` をブラウザで直接開く(file://可)か、任意の静的サーバーで配信
- **構文チェック:** `node --check script/*.js` (ファイルごとに実行)
- **動作確認:** ブラウザで起動し、タイトル画面のバージョン表記(`Alpha Ver x.x.x`)をクリックするとデバッグパネルが開く(下記「デバッグモード」参照)

## アーキテクチャ

### スクリプト構成と読み込み順(重要)

ES Modulesは**不使用**。全ファイルが1つのグローバルスコープを共有する古典的`<script>`タグ方式で、`index.html` 記載の順に読み込まれる。**順序に依存関係がある**(後のファイルは前のファイルのトップレベル`const`/`let`を参照する):

```
utils → config → i18n → dom → state → logic → render → actions → screens → main
```

| ファイル | 役割 |
|---|---|
| `utils.js` | 汎用ヘルパー(乱数、トースト、ツールチップ) |
| `config.js` | 全定数: `GAME_VERSION`, `IS_DEBUG`, **バランス定数**, `COLOR_POOL`, `PERKS`, `ITEM_REGISTRY` |
| `i18n.js` | `translations` テーブル、`t()`, `setLang()` |
| `dom.js` | 主要DOM要素への`const`参照 |
| `state.js` | `gameState`(唯一の可変状態)、セーブ/ロード、`pushHistory()` |
| `logic.js` | 純ロジック: `canPour`, `isCompleteTube`, `generateBoard`, 目標生成、Perk抽選、価格計算 |
| `render.js` | DOM描画: `renderBoard`, `renderHUD`, `renderSkills`, アニメーション、無限スクロール |
| `actions.js` | 操作実行: `tryPour`, `handleCompletion`, `useItem`, `tryUndo`, `nextFloor`, `startNewRun` |
| `screens.js` | モーダル群: Perk選択/ショップ(`openPerkScreen`)、完成イベント、ステータス、ヘルプ |
| `main.js` | 全イベントバインディングと初期化(必ず最後) |

**注意:** `index.html` 内に `onclick="setLang('en')"` 等のインラインハンドラがあるため、`setLang`, `setPalette`, `closeModal`, `copyResult`, `startNewRun` はグローバル関数のまま維持すること。

### 状態管理

- `gameState`(state.js)が唯一の真実。`saveGame()` でそのままJSON化して `localStorage`(キー: `abyssal_alchemy_save_v1`)へ保存される。**フィールドを追加したら `loadGame()` に旧セーブ向けのデフォルト補完を追加する**こと(例: `completedFlags` の補完が既にある)。
- **Undo:** 各操作前に `pushHistory()` でスナップショットを取る。`tryUndo()` は盤面(`tubes`)等を復元するが、**hp / essence / pressure / turnCount は意図的に巻き戻さない**(仕様)。コストは `UNDO_COST` エッセンス、`refluxUses` があれば無料(代わりにプレッシャー+2)。

### 描画の差分更新(落とし穴)

`renderBoard()` は各チューブの内容を `water.dataset.lastState`(JSON文字列)と比較して差分更新する。**コードから `gameState.tubes` を直接書き換えた場合**、`document.querySelectorAll('.water-container').forEach(el => delete el.dataset.lastState)` を実行するか `renderBoard(true)` を呼ばないと画面に反映されない。また盤面は無限横スクロールのため各チューブが `CLONE_PADDING`(30個)のクローンと共に描画される — チューブ要素の取得は必ず `.tube[data-idx="N"]` で**全該当要素**に対して行う。

### コアルール(ゲームロジック)

- **完成判定 `isCompleteTube()`:** 全段同色かつ「その色の盤面総数と一致」**または**「容量(capacity)以上」で完成。盤面総数一致ルールがあるため、4個未満の色でも完成しうる点に注意。
- **プレッシャー:** 1回の注ぎで `PRESSURE_PER_POUR`(=1)上昇(まとめて注いでも+1)。`pressureMax` 到達で0にリセット+HP-1+`corruptRandomSegment()` が黒インク(K)を盤面に追加。
- **黒インク(K):** チューブを満たすと蒸発してチューブが空になり、エッセンスを得る。完成色としてはカウントされない。
- **階層進行:** `nextFloor()` で capacity が 4→5(4F)→6(8F)→8(12F) と拡大。プレッシャーは階層をまたいで持ち越し。
- **ショップ価格:** `getPriceMultiplier()` が階層で逓増(6F: x1.2 / 11F: x1.5 / 21F〜: x2.0*1.1^n / 31F〜: さらに1.3^n)。
- **ボス階層:** 10の倍数階は `bossState` を持つ3フェーズ制の専用エリア。アイテム使用で核露出・攻撃遅延、未使用時は色2本完成で核露出。ボス中は通常の色完成イベントを表示しない。
- **ボス支給品:** `temporaryInventory` で通常在庫と区別し、使用時は一時在庫から先に消費、撃破後に残数を除去する。Undo履歴には `bossState` と `temporaryInventory` の両方を含める。
- **深淵脈動:** `abyssAttention` が100に達すると `pendingAnomalyId` を予約し、次の非ボス階層で `anomaly` を生成する。異常攻撃は必ずカウントダウンと対象を描画し、黒インク追加時はデッドロック検査を通す。
- **深淵契約:** 5階層ごとに `routeContract` を選択し、5階層の報酬・注目度・開始圧力・追加圧力へ反映する。
- **オーバードライブ:** Perkの通常上限はLv.4。Lv.3からの強化時に `overdrives[perkId]` へ `surge` または `stable` を保存する。
- **固有ボス:** `bossState.bossId` により `advanceBossTurn()` の攻撃が分岐する。攻撃対象は `telegraphTubeIdx` で2手前から予告する。
- **セーブ移行:** 0.8.00の追加状態は `migrateV080State()` で旧セーブへ補完する。保存キーは互換維持のためv1のまま。

### コンテンツ追加の作法

- **バランス調整:** `config.js` 冒頭のバランス定数(`PRESSURE_MAX_BASE`, `PRESSURE_PER_POUR`, `FLOOR_CLEAR_BASE_REWARD`, `UNDO_COST`, `INVENTORY_LIMIT` 等)を変更する。ロジック内にマジックナンバーを増やさない。
- **Perk追加:** `PERKS` にエントリー追加。説明文の `[Lv]`, `[Lv x 2]` 等のトークンは `getPerkDesc()`(logic.js)の置換リストで展開される — **新しい数式トークンを使う場合は置換処理も追加する**。効果の実装は主に `handleCompletion()`(色完成時)や `nextFloor()`(階層開始時)に分岐がある。
- **アイテム追加:** `ITEM_REGISTRY` にエントリー追加。`behaviorType` は3種: `instant`(即時、`effect(gs)`)、`target_effect`(対象チューブ選択、`canUseOn`/`apply`)、`two_step`(抽出→配置、`extractLogic`/`placeLogic`)。ショップには `SHOP_POOL` 経由で自動的に並ぶ。
- **i18n:** UI文字列はすべて日英両対応。`translations`(i18n.js)またはエンティティごとの `name: {en, ja}` / `desc: {en, ja}` 形式を必ず両方書く。判定は `currentLang`。

### デバッグモード

`config.js` の `IS_DEBUG = true` の間、タイトル画面のバージョン表記クリックで開始階層セレクターが出現する。開始階層に1以上を入れると `isExecutionDebug` が立ち、エッセンス9999・全アイテム所持・Perk全候補表示になる。**0のままなら通常プレイ**。初期 `gameState.inventory` も `IS_DEBUG` 時は全アイテム3個で始まる。

### 既知の設計メモ

- `script/script.js.bak` は分割前の旧単一ファイル(参照用、読み込まれない)。
- セーブデータの互換性を壊す変更をした場合は `SAVE_KEY`(state.js)のバージョンを上げる。
- `applyPressureDamage` は `async`。完成時の連鎖処理(`handleCompletion`)は `await` チェーンで進むため、途中に`await`必須の処理を挟む場合は呼び出し元まで `async` を貫通させること。
