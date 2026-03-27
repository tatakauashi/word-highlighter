# Word Highlighter — タスク管理

## フェーズ1〜8: 初期セットアップ〜ナビゲーターバー修正 ✅（完了済み）

---

## フェーズ9: Claude.ai サイドバー除外 ✅

- [x] `EXCLUDED_ANCESTOR_SELECTORS = 'nav, aside, header, footer'` 定数を追加
- [x] `walkAndHighlight` の `acceptNode` フィルターで `closest()` による先祖チェックを追加
  - 従来: 直接の親タグのみ確認 → サイドバー内の深いネストを見落とし
  - 修正後: `closest()` で先祖まで遡り、nav/aside 配下のテキストを除外
  - 副次効果: サイドバーへの scrollIntoView が起きなくなり、スクロール起因の
    再検索ループも解消
- [x] `npm run build` 通過（highlighter.js: 5.89 kB）
- [x] `npm run typecheck` 通過
