# Voice Recorder - 実装計画

## 現状

- 現在のリポジトリは **Tauri 2 の初期テンプレート** に近い状態。
- Rust 側は `greet` command のみ、フロントエンドもサンプル UI のまま。
- Phase 1 は **録音して保存する最小機能** に絞る。

---

## 技術方針

### フロントエンド

Phase 1 から **React** を使う。

- `react`
- `react-dom`
- `tailwindcss`
- Vite の React 構成に移行する
- スタイリングは Tailwind utility class を優先する

Phase 1 では shadcn/ui は必須にしない。  
まず Tailwind で UI を軽く組み、必要になったら shadcn/ui を追加する。

### バックエンド

- Tauri command でフロントエンドから録音データを受け取る
- Rust 側でファイル保存と SQLite 登録を行う
- フロントエンドには保存結果だけを返す
- Rust の DB アクセスは `src-tauri/src/commands/` ではなく `src-tauri/src/infrastructure/` に置く
- Rust の persistence helper は目的ごとにファイル分割する
- Rust の command wrapper は薄く保ち、response type も command file には置かない

---

## 実装体制

### Claude の役割

- 実装担当
- 毎回 **`AGENTS.md` と `PLAN.md` を読んでから** 作業する
- 担当レーンの実装を進める
- 自分の担当外の方針変更はしない

### Copilot の役割

- レビューと修正担当
- Claude の変更を見て、問題があれば修正する
- 再発しそうな問題や運用ルールが見えたら **`AGENTS.md` に追記** する
- 追記後、次の Claude 実装はその更新済み `AGENTS.md` に従わせる

### ループ

1. Claude が実装する
2. Copilot がレビューして必要なら修正する
3. Copilot が新ルールを `AGENTS.md` に追加する
4. 次の Claude 実装は更新後の `AGENTS.md` を前提に進める

---

## 待ち状態の運用

- Claude 側または Copilot 側で待ち状態がある場合は、**30 秒ごとに状態確認する**
- 背景タスク、ビルド、外部エージェント待ちでも同じ
- 状態が変わるまで同じ粒度でポーリングする

---

## タスク管理

- 人が読むタスク管理は **テキストファイル** で行う
- 作業ボードはセッション用ファイル `tasks.txt` を使う
- `tasks.txt` には **レーン / 担当 / 状態 / 次アクション** を書く

このファイルは運用用であり、実装コードとは分けて扱う。

---

## Phase 1 のゴール

1. React 画面から録音開始 / 停止ができる
2. 録音データを Tauri command 経由で Rust に渡せる
3. Rust 側でアプリ管理ディレクトリに音声ファイルを保存できる
4. SQLite にメタデータを保存できる
5. 成功 / 失敗が UI に表示される

### 完了条件

- 初回起動時にマイク許可を求める
- 録音中は UI で状態がわかる
- 停止後、保存ファイル 1 件と DB レコード 1 件が作成される
- 失敗時は UI にエラーが表示される

---

## 先に固定する契約

### フロントエンドの責務分離

React コンポーネント内では **`try/catch` を書かない**。  
コンポーネントは `AppResult` を受け取り、結果に応じて表示と状態遷移だけを行う。

**責務の置き場所**

- `src/infrastructure/services/` - ブラウザ API や外部 I/O を扱う
- `src/infrastructure/repositories/` - Tauri command 呼び出しを扱う
- `src/application/usecases/` - コンポーネントから呼ばれるアプリケーションロジックを扱う
- `src/shared/result/` - `AppResult` の型と helper を置く

**コンポーネントの役割**

- イベントを受け取る
- usecase を呼ぶ
- `result.ok` を見て UI を分岐する

**コンポーネントでやらないこと**

- `try/catch`
- Tauri command の直接呼び出し
- ブラウザ API への直接依存
- エラー整形

### AppResult

```ts
export type AppResult<T, E extends string = string> =
  | { ok: true; data: T }
  | { ok: false; error: { code: E; message: string } };
```

**使い方の方針**

- service / repository / usecase は `Promise<AppResult<...>>` を返してよい
- React コンポーネントは `AppResult` を分岐するだけにする
- 例外を握りつぶさず、`code` と `message` を持つ失敗結果に変換する
- `AppResult` の生成関数は `succeed` と `fail` に統一する

### frontend -> backend

```ts
{
  name: string;
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
}
```

### backend -> frontend

```ts
{
  id: string;
  storedPath: string;
  originalMimeType: string;
  originalExtension: string;
}
```

### error surface

- マイク取得失敗
- 録音停止失敗
- command 呼び出し失敗
- ファイル書き込み失敗
- DB 保存失敗

**推奨 error code**

- `microphone_permission_denied`
- `microphone_unavailable`
- `recording_start_failed`
- `recording_stop_failed`
- `recording_data_empty`
- `save_command_failed`
- `file_write_failed`
- `database_write_failed`

---

## 並列実装レーン

### Lane 0: 契約固定

**担当**: Copilot

- command 入出力 shape を固定
- SQLite の最小スキーマを固定
- 保存先と命名規則を固定
- `AGENTS.md` と `PLAN.md` に反映

### Lane 1: React 土台

**担当**: Claude 実装 → Copilot レビュー

**対象ファイル**

- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`

**内容**

- React エントリーポイントへの移行
- 単一画面の録音 UI
- 状態表示とエラー表示の骨組み
- コンポーネント内で `try/catch` を使わず、usecase の `AppResult` で分岐する前提にする

**前提**

- **Lane 4 完了後に着手**
- React 未導入の状態では開始しない

### Lane 2: RecorderService

**担当**: Claude 実装 → Copilot レビュー

**対象ファイル**

- `src/infrastructure/services/recorder-service.ts`

**内容**

- `getUserMedia({ audio: true })`
- `MediaRecorder.isTypeSupported()` による MIME type 判定
- `start()` / `stop()` / `dispose()`
- `Blob`, `mimeType`, `suggestedExtension` の返却
- 失敗時は `AppResult` で明示的に返す

### Lane 3: Rust 保存基盤

**担当**: Claude 実装 → Copilot レビュー

**対象ファイル**

- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/src/db.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/commands/audio_file.rs`

**内容**

- SQLite 初期化
- `audio_files` テーブル作成
- 録音データ保存
- `save_recording` command 実装

### Lane 4: 開発基盤

**担当**: Copilot

**対象ファイル**

- `src-tauri/tauri.conf.json`
- `package.json`

**内容**

- React 用依存追加
- Vite React 化
- `npm run dev` / `npm run build` に統一

**優先度**

- **Lane 1 より先に終わっている必要がある**
- React 依存の実装レーンのブロッカーとして扱う

### Lane 5: 結合

**担当**: Copilot 主導

**対象ファイル**

- `src/shared/result/app-result.ts`
- `src/application/usecases/record-audio-file-usecase.ts`
- `src/infrastructure/repositories/audio-file-repository.ts`
- `src/App.tsx`

**内容**

- `Blob -> Uint8Array` 変換
- `invoke('save_recording', ...)`
- UI, RecorderService, Rust command の結合
- 成功 / 失敗の end-to-end 接続
- `AppResult` を使って UI の結果分岐を統一

### Lane 6: MP3 技術検証

**担当**: Claude 実装 or 調査 → Copilot 判定

- raw 保存完了後に着手
- `symphonia`, `mp3lame-encoder` 候補調査
- Phase 1 本体とは分離して扱う

---

## 依存関係

```text
Lane 0
  ├─ Lane 4
  ├─ Lane 2
  ├─ Lane 3
  └─ Lane 1 (after Lane 4)

Lane 1 + Lane 2 + Lane 3 + Lane 4
  └─ Lane 5

Lane 3
  └─ Lane 6
```

---

## 着手順の修正

Claude の指摘どおり、現時点では React はまだ入っていない。  
そのため、最初の着手順は次のようにする。

1. Copilot が Lane 4 を進めて React 導入を完了する
2. Claude はその間に Lane 2 を進めてよい
3. Claude は Lane 3 も並行で進めてよい
4. Lane 1 は Lane 4 完了後に開始する
5. Lane 5 は Lane 1 / 2 / 3 / 4 完了後に入る

---

## データモデル

```sql
CREATE TABLE audio_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  original_extension TEXT NOT NULL,
  original_mime_type TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 推奨ディレクトリ構成

```text
src/
  application/
    usecases/
      record-audio-file-usecase.ts
  infrastructure/
    repositories/
      audio-file-repository.ts
    services/
      recorder-service.ts
  App.tsx
  main.tsx
  styles.css

src-tauri/src/
  commands/
    mod.rs
    audio_file.rs
  db.rs
  lib.rs
  main.rs
```

---

## 検証

1. `npm install`
2. `npm run tauri dev`
3. 録音開始でマイク許可が出る
4. 録音停止後に保存成功メッセージが出る
5. `app_data_dir` 配下に保存ファイルができる
6. SQLite に 1 レコード作られる
7. 失敗時に UI にエラーが出る

---

## 追加設計: 録音中の波形と録音時間

この機能は **録音中だけ live 表示** する。  
保存後に波形を再生成する設計にはせず、まずは **現在録音している入力音声の可視化** に絞る。

### 目的

1. 録音が本当に動いていることを視覚的にわかりやすくする
2. 録音開始からの経過時間を明示する
3. React コンポーネントを複雑にせず、既存の `AppResult` 方針を壊さない

### 責務分離

#### `src/infrastructure/services/recorder-service.ts`

録音サービスが引き続きブラウザ API を所有する。  
ここに **録音監視用の AudioContext / AnalyserNode** を追加する。

持つ責務:

- `MediaRecorder` の開始 / 停止
- `MediaStream` の管理
- `AudioContext`
- `MediaStreamAudioSourceNode`
- `AnalyserNode`
- 録音開始時刻の保持
- 波形サンプル取得

#### `src/application/usecases/`

React から直接 `RecorderService` の内部状態を読ませず、  
**UI 用 snapshot を返す usecase** を追加する。

候補:

- `get-recording-monitor-snapshot-usecase.ts`

この usecase は次を返す:

- 経過時間
- 表示用フォーマット済み時間
- 波形バー配列

#### `src/view/pages/RecordAudioPage.tsx`

React 側は次だけを行う:

- 録音中に `requestAnimationFrame` ループを開始する
- usecase から snapshot を受け取って state を更新する
- 波形と時間を描画する

コンポーネント内で `try/catch` は使わない。  
ブラウザ音声 API は service 側に閉じ込める。

### データ形

#### RecorderService が返す低レベル snapshot

```ts
type RecordingMonitorSnapshot = {
  elapsedMs: number;
  waveform: number[];
};
```

`waveform` は **0.0 - 1.0** に正規化した配列とする。  
UI はこの配列をそのまま棒グラフ表示できるようにする。

#### usecase が返す UI 向け snapshot

```ts
type RecordingMonitorViewModel = {
  elapsedMs: number;
  elapsedLabel: string; // 00:13
  waveform: number[];
};
```

### RecorderService の追加 API

既存 API:

- `start()`
- `stop()`
- `dispose()`

追加 API:

```ts
getMonitorSnapshot(): AppResult<RecordingMonitorSnapshot, RecorderErrorCode>
```

このメソッドは:

- 録音中でなければ失敗を返す
- `AnalyserNode` から時系列データを取得する
- 画面表示用に downsample した配列を返す
- `performance.now()` または録音開始時刻との差分で `elapsedMs` を返す

### 波形生成方法

実装方針:

1. `AudioContext` を録音開始時に生成
2. `MediaStreamAudioSourceNode` を `mediaStream` から作成
3. `AnalyserNode` を接続
4. `getByteTimeDomainData()` で PCM 風データを取得
5. それを 32 本前後の棒データへ圧縮する

推奨パラメータ:

- `fftSize`: 1024 または 2048
- 表示バー数: 32

downsample は **各区間の平均絶対振幅** を使う。  
これで細かすぎない安定した波形になる。

### 録音時間

録音時間は **録音開始時刻からの経過時間** を使う。

表示形式:

- 1 時間未満: `mm:ss`
- 1 時間以上: `hh:mm:ss`

format は usecase 側で行う。  
React 側では文字列をそのまま表示するだけにする。

### UI 構成

`RecordAudioPage` に次を追加する。

1. 録音中インジケーター
2. 経過時間表示
3. 波形バー表示

Tailwind での構成イメージ:

- 時間表示: 中央寄せの大きい monospace 風表示
- 波形表示: 横並びの bar 32 本
- 各 bar は `h-2` から `h-20` 程度の高さに変化

### state 設計

`RecordAudioPage` 側の追加 state:

```ts
const [elapsedLabel, setElapsedLabel] = useState("00:00");
const [waveform, setWaveform] = useState<number[]>(DEFAULT_WAVEFORM);
```

録音開始時:

- monitor loop 開始
- `elapsedLabel` を `00:00` に初期化
- `waveform` を初期配列に戻す

録音停止時:

- monitor loop 停止
- `waveform` を初期配列に戻す

### monitor loop

React 側では `requestAnimationFrame` を使う。

理由:

- setInterval より描画タイミングに同期しやすい
- 波形表示との相性がよい

流れ:

1. `state === "recording"` で loop 開始
2. `executeGetRecordingMonitorSnapshot(recorder)` を呼ぶ
3. 成功なら `elapsedLabel` と `waveform` を更新
4. `state !== "recording"` で loop 停止
5. unmount 時も cancel

### エラー方針

monitor 取得失敗は **録音本体の失敗と分ける**。

追加候補 error code:

- `recording_monitor_unavailable`

ただし monitor 表示取得に失敗しても、録音そのものが進んでいるなら  
**即座に録音停止扱いにはしない** 方がよい。

推奨方針:

- monitor 失敗時は波形表示だけを止める
- 時間表示は最後の値を保持する
- 録音 stop/save フローはそのまま継続する

### 実装単位

1. `RecorderService` に analyser と elapsed 計測を追加
2. `get-recording-monitor-snapshot-usecase.ts` を追加
3. `RecordAudioPage` に monitor state と animation loop を追加
4. Tailwind で波形 UI を追加
5. stop/dispose 時に AudioContext を確実に閉じる

### 完了条件

1. 録音開始後すぐに `00:00` から時間が進む
2. 入力音声に応じて波形バーが変化する
3. 録音停止で時間と波形更新が止まる
4. 保存フローは既存どおり動く
5. monitor 関連で React コンポーネントに `try/catch` を増やさない
