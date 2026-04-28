# Voice Recorder

Tauri v2 + React で構築したデスクトップ向け音声録音・管理アプリケーション。
ブラウザの MediaRecorder API で録音し、Rust バックエンドで音声ファイルの保存・変換・文字起こしまでを一貫して処理します。

## 主な機能

- 音声の録音（WebAudio / MediaRecorder）とリアルタイム波形表示
- 録音ファイルの一覧・詳細表示・再生・削除
- ffmpeg による MP3 変換
- 音声ファイルの文字起こし（Whisper 連携）
- SQLite によるメタデータ管理

## 技術構成

### フロントエンド

| カテゴリ | 技術 |
|---|---|
| フレームワーク | React 19 |
| ビルドツール | Vite 6 |
| 状態管理 / データ取得 | TanStack Query (React Query) v5 |
| スタイリング | Tailwind CSS v4 |
| UI コンポーネント | shadcn/ui (Radix UI + CVA) |
| アイコン | Lucide React |
| 言語 | TypeScript 5.6 |

### バックエンド（Tauri / Rust）

| カテゴリ | 技術 |
|---|---|
| デスクトップフレームワーク | Tauri v2 |
| データベース | SQLite（rusqlite） |
| 音声変換 | ffmpeg（外部コマンド呼び出し） |
| ID 生成 | uuid v4 |
| 日時処理 | chrono |
| シリアライズ | serde / serde_json |

### アーキテクチャ

```
src/                          # フロントエンド
├── application/usecases/     # ユースケース層
├── infrastructure/
│   ├── repositories/         # Tauri コマンド呼び出し（リポジトリ）
│   └── services/             # MediaRecorder ラッパー
├── shared/result/            # Result 型ユーティリティ
├── view/
│   ├── components/           # 共通 UI コンポーネント
│   └── pages/                # ページコンポーネント
└── components/ui/            # shadcn/ui コンポーネント

src-tauri/src/                # バックエンド (Rust)
├── commands/audio_file/      # Tauri コマンドハンドラ
└── infrastructure/
    ├── audio_file/           # ファイル I/O・DB 操作
    ├── audio_converter/      # ffmpeg / Whisper 連携
    └── database.rs           # SQLite 初期化
```

フロントエンド・バックエンドともにクリーンアーキテクチャを意識し、ユースケース / インフラストラクチャ / プレゼンテーションの各層を分離しています。

## 前提条件

- [Node.js](https://nodejs.org/) v18 以上
- [Rust](https://www.rust-lang.org/tools/install)（最新 stable）
- [Tauri v2 の前提パッケージ](https://v2.tauri.app/start/prerequisites/)（OS ごとのシステム依存ライブラリ）
- [ffmpeg](https://ffmpeg.org/)（MP3 変換機能を使う場合）

## セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/seekseep/voice-recorder.git
cd voice-recorder

# フロントエンドの依存インストール
npm install
```

## 起動方法

### 開発モード

```bash
npm run tauri dev
```

Vite の開発サーバーが起動し、Tauri のネイティブウィンドウでアプリが開きます。
ホットリロード対応のため、フロントエンドの変更は即座に反映されます。

### プロダクションビルド

```bash
npm run tauri build
```

`src-tauri/target/release/bundle/` にインストーラー付きバイナリが生成されます。

### フロントエンドのみ（ブラウザ確認）

```bash
npm run dev      # 開発サーバー起動（http://localhost:1420）
npm run build    # 本番ビルド
npm run preview  # ビルド結果のプレビュー
```

## 推奨 IDE 設定

- [VS Code](https://code.visualstudio.com/)
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
