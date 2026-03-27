# 教訓

## TreeWalker の acceptNode は直接の親しか見ない

### 問題
`node.parentNode.tagName` チェックは直接の親タグのみ確認する。
サイドバーのように深くネストされた構造（`nav > div > ul > li > span > text`）では
テキストノードの直接の親は `span` であり、`nav` を見落とす。

### 修正パターン
`closest()` で先祖まで遡って確認する：

```js
if (parent.closest('nav, aside, header, footer')) {
  return NodeFilter.FILTER_REJECT
}
```

### 副次効果
サイドバー内のテキストをハイライト対象から除外することで、
サイドバーへの `scrollIntoView` も発生しなくなり、
スクロール起因の MutationObserver 再トリガーループも防げる。

---

## MutationObserver の自己トリガー問題

### 問題
`subtree: true` + `characterData: true` で `document.body` を監視すると、
自分が注入した UI 要素（ナビゲーターバーなど）のテキスト変更も検知してしまう。

### 具体的な罠
- `element.textContent = "..."` は characterData 変更として Observer に通知される
- `classList.add/remove` は attribute 変更なので `attributes: true` がなければ検知されない
- `disconnect()` → `reconnect()` は applyHighlights 実行中の自己トリガーを防ぐが、
  ナビゲーション操作（Observer 接続中）からの UI 更新は防げない

### 修正パターン
Observer コールバックの先頭で、自前の UI 要素を発生源とする変更を除外する：

```js
const targetEl = m.target instanceof Element ? m.target : m.target.parentElement
if (targetEl?.closest('#my-injected-ui')) return false
```
