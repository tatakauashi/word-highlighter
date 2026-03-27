# Word Highlighter

AI チャットサービスの画面上で、登録した「ワード」を自動的にハイライト表示する Chrome 拡張機能です。

チャット内容を SNS などにコピー&ペーストする際、本名などの個人情報が含まれていないかを視覚的に確認するためのツールです。

## 対応サービス

| サービス | URL |
|----------|-----|
| Claude.ai | https://claude.ai |
| ChatGPT | https://chatgpt.com / https://chat.openai.com |
| Gemini | https://gemini.google.com |

## 機能

### ワード管理
- ワードの追加・削除・一覧表示
- 設定は `chrome.storage.sync` に保存され、複数端末で同期されます
- 上限: 50ワード・1ワード 100文字まで

### ハイライト表示
- 登録したワードをチャット画面上で黄色くハイライト
- 大文字・小文字を区別しない（英語ワードに対応）
- 動的に更新されるチャット内容にも自動追従（MutationObserver）

### ナビゲーターバー
- 画面右上にマッチ件数を表示（例: `5件`）
- ◀ / ▶ ボタンで各マッチ箇所へジャンプ
- 現在位置はオレンジ色でハイライト（例: `2 / 5件`）
- バーはドラッグで好きな位置に移動できます

## インストール（開発版）

### 必要環境
- Node.js 18 以上
- npm

### ビルド

```bash
npm install
npm run build
```

`dist/` ディレクトリにビルド済みファイルが生成されます。

### Chrome への読み込み

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist/` フォルダを選択する

### 開発時（ウォッチモード）

```bash
npm run dev
```

ファイルを変更するたびに自動でビルドされます。Chrome 拡張機能の再読み込みは手動で行ってください。

## 使い方

1. 拡張機能をインストール後、ツールバーのアイコンを右クリック →「オプション」を開く
2. ワードを入力して「追加」ボタンを押す
3. 対象サービスのチャット画面を開くと、登録したワードが自動的にハイライトされる

## プロジェクト構成

```
word-highlighter/
├── src/
│   ├── content/
│   │   └── highlighter.ts      # DOM 監視・ハイライト処理・ナビゲーターバー
│   ├── options/
│   │   ├── options.html        # ワード管理 UI
│   │   ├── options.ts          # Options Page ロジック
│   │   └── options.css
│   └── background/
│       └── service_worker.ts   # Service Worker（将来の拡張用）
├── manifest.json               # Manifest V3
├── vite.config.ts              # ビルド設定（プラグインなし）
├── tsconfig.json
└── package.json
```

## 技術スタック

| 項目 | 内容 |
|------|------|
| ビルドツール | Vite 6.4.1（プラグインなし） |
| 言語 | TypeScript 5.4.5 |
| Manifest | V3 |
| 外部ライブラリ | なし（バンドルサイズ最小） |

## セキュリティ

- `innerHTML` 不使用 — DOM API のみでハイライト要素を生成（XSS 対策）
- 正規表現エスケープ済み（ReDoS 対策）
- 権限は最小限: `storage` + 対象3サービスの `host_permissions` のみ
- CSP: `script-src 'self'; object-src 'none'`
- `chrome.storage` にはワードのみ保存
