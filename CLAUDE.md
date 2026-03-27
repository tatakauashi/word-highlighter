# CLAUDE.md — Word Highlighter Chrome Extension

## エージェント行動指針

**セッション開始時に必ず `.claude/agent-workflow.md` を読め。** すべての行動原則・ワークフロー・セキュリティ要件はそこに定義されている。以降の指示はそれに従うことを前提とする。

---

## プロジェクト概要

AI チャットサービスの Web 画面上で、ユーザーが登録した「ワード」を自動的にハイライト表示する Chrome 拡張機能。  
チャット内容をコピーして SNS などに貼り付ける際、共有したくない個人情報（本名など）が含まれていないかを視覚的に確認するためのツール。

### 対象サービス
- Claude.ai
- ChatGPT（chat.openai.com）
- Gemini（gemini.google.com）

---

## プロジェクト構成

```
word-highlighter/
├── .claude/
│   └── agent-workflow.md       # エージェント行動指針（必読）
├── tasks/
│   ├── todo.md                 # タスク管理・進捗追跡
│   └── lessons.md              # 教訓の蓄積
├── src/
│   ├── content/
│   │   └── highlighter.ts      # 各AIサービスのDOM監視・ハイライト処理
│   ├── options/
│   │   ├── options.html        # ワード管理UI
│   │   ├── options.ts          # Options Page ロジック
│   │   └── options.css
│   └── background/
│       └── service_worker.ts   # バックグラウンド処理（必要に応じて）
├── manifest.json               # Manifest V3
├── tsconfig.json
├── package.json
└── CLAUDE.md                   # このファイル
```

---

## 機能要件

### ワード管理（Options Page）
- ワードの追加・削除・一覧表示
- 登録データは `chrome.storage.sync` に永続化する
- 登録上限・入力文字数上限を設ける（無制限入力はパフォーマンスリスク）

### ハイライト表示（Content Script）
- 対象 3 サービスのチャット画面で、登録済み ワードを自動検出してハイライトする
- 各サービスは動的に DOM が更新されるため、`MutationObserver` で変更を監視する
- ワードは大文字・小文字を区別しない（英語ワードを考慮）

#### ハイライトのデザイン要件
- **背景色**: 黄色系（視認性を損なわない範囲で調整してよい）
- **枠線**: 角丸（`border-radius` を適用）、黒く縁取り
- **文字**: 太字（`font-weight: bold`）、文字色を黒くする
- 上記を基本とし、対象サービスの背景・フォントに対して視認性が十分確保できる範囲でデザインを調整してよい
- ハイライト用の `<mark>` 要素または `<span>` 要素を使用し、既存テキストの行間・レイアウトを大きく崩さないこと

### ストレージ変更への追従
- Options Page でワードが変更されたら、開いているタブのハイライトをリアルタイムで更新する

---

## 技術スタック・制約

- **Manifest V3**（MV2 は非推奨のため使用禁止）
- **TypeScript** を使用する
- **ビルドツール**: Vite または webpack（いずれか適切な方を選択してよい）
- **外部ライブラリ**: 必要最小限に留める。導入前に CVE を確認すること
- Node.js / npm によるパッケージ管理

---

## セキュリティ要件

`.claude/agent-workflow.md` のセキュリティセクションに加え、本プロジェクト固有の要件を以下に定める。

- **Content Script の権限は最小限に**: `activeTab` + 対象ドメインの `host_permissions` のみ。不要なパーミッションを要求するな
- **ワードのサニタイズ**: ユーザー入力の ワードを DOM 操作に使う際は必ずエスケープ処理を行え。XSS の余地を残すな（特に `innerHTML` の使用は原則禁止。`textContent` または安全な DOM API を使え）
- **正規表現の DoS（ReDoS）対策**: ワードを正規表現に変換する場合、ユーザー入力をそのままパターンに組み込むな。エスケープ処理を必ず行え
- **`chrome.storage` に機密情報を保存しない**: ワード自体はユーザーが意図的に登録するものだが、それ以外の情報（セッション情報など）を保存するな
- **CSP（Content Security Policy）**: `manifest.json` に適切な CSP を設定し、`unsafe-inline` / `unsafe-eval` は使用禁止

---

## 対象サービスの DOM 構造メモ

各サービスは DOM 構造が変更されることがある。**実装前に必ず現在の DOM を調査し、セレクターをハードコードするな。** 設定ファイルまたは定数として分離し、変更容易な構造にすること。

| サービス | 注意点 |
|----------|--------|
| Claude.ai | Shadow DOM を使用している箇所がある可能性 |
| ChatGPT | ストリーミング表示中の DOM 更新が高頻度 |
| Gemini | SPA のルーティング変更でコンテンツが差し替わる |

---

## タスク管理ルール

- 実装開始前に `tasks/todo.md` に計画を書き、ユーザーの確認を取ること
- 完了ステップは随時チェックを入れること
- ユーザーから修正を受けたら `tasks/lessons.md` を更新すること

詳細は `.claude/agent-workflow.md` の「タスク管理」セクションを参照。
