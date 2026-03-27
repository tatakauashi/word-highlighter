/**
 * highlighter.ts — ワードのハイライト処理 + ナビゲーターバー
 *
 * セキュリティ要件:
 * - innerHTML は使用禁止。DOM API のみでノードを操作する
 * - ユーザー入力の正規表現エスケープ（ReDoS 対策）
 * - XSS 余地なし（textContent のみ使用）
 */

const STORAGE_KEY = 'specWords'
const HIGHLIGHT_CLASS = 'word-highlight'
const CURRENT_CLASS = 'word-highlight-current'
const STYLE_ID = 'word-highlighter-style'
const NAVIGATOR_ID = 'word-navigator'

// ハイライト対象から除外する先祖要素セレクター。
// サイドバー・ナビゲーション・ヘッダー・フッターなどのUI要素を対象外にする。
// セレクターを変更することで除外範囲を調整できる。
const EXCLUDED_ANCESTOR_SELECTORS = 'nav, aside, header, footer'

// ---------------------------------------------------------------------------
// スタイル注入
// ---------------------------------------------------------------------------

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = [
    `.${HIGHLIGHT_CLASS} {`,
    '  background-color: #ffe066;',
    '  color: #000 !important;',
    '  font-weight: bold !important;',
    '  border: 1px solid #000;',
    '  border-radius: 3px;',
    '  padding: 0 2px;',
    '  line-height: inherit;',
    '}',
    `.${CURRENT_CLASS} {`,
    '  background-color: #ff8c00 !important;',
    '  color: #fff !important;',
    '  outline: 2px solid #cc5500;',
    '}',
    `#${NAVIGATOR_ID} {`,
    '  position: fixed;',
    '  top: 12px;',
    '  right: 12px;',
    '  z-index: 2147483647;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 4px;',
    '  padding: 6px 10px;',
    '  background: rgba(30, 30, 30, 0.92);',
    '  color: #fff;',
    '  font-size: 13px;',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '  border-radius: 8px;',
    '  box-shadow: 0 2px 8px rgba(0,0,0,0.4);',
    '  user-select: none;',
    '  line-height: 1;',
    '  cursor: grab;',
    '}',
    `#${NAVIGATOR_ID}.dragging {`,
    '  cursor: grabbing;',
    '  box-shadow: 0 4px 16px rgba(0,0,0,0.5);',
    '}',
    `#${NAVIGATOR_ID} .word-nav-label {`,
    '  font-size: 11px;',
    '  opacity: 0.7;',
    '  margin-right: 2px;',
    '}',
    `#${NAVIGATOR_ID} .word-nav-count {`,
    '  min-width: 48px;',
    '  text-align: center;',
    '  font-weight: bold;',
    '}',
    `#${NAVIGATOR_ID} button {`,
    '  background: none;',
    '  border: 1px solid rgba(255,255,255,0.3);',
    '  border-radius: 4px;',
    '  color: #fff;',
    '  font-size: 12px;',
    '  width: 24px;',
    '  height: 24px;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  padding: 0;',
    '  flex-shrink: 0;',
    '}',
    `#${NAVIGATOR_ID} button:hover:not(:disabled) {`,
    '  background: rgba(255,255,255,0.2);',
    '}',
    `#${NAVIGATOR_ID} button:disabled {`,
    '  opacity: 0.35;',
    '  cursor: default;',
    '}',
  ].join('\n')
  document.head.appendChild(style)
}

// ---------------------------------------------------------------------------
// 正規表現ユーティリティ
// ---------------------------------------------------------------------------

/** ユーザー入力を正規表現のリテラルとして安全にエスケープする（ReDoS 対策） */
function escapeRegExp(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** ワードリストから大文字小文字を区別しない正規表現を生成する */
function buildPattern(words: string[]): RegExp | null {
  if (words.length === 0) return null
  const escaped = words.map(escapeRegExp)
  escaped.sort((a, b) => b.length - a.length)
  return new RegExp(`(${escaped.join('|')})`, 'gi')
}

// ---------------------------------------------------------------------------
// ハイライト処理
// ---------------------------------------------------------------------------

function highlightTextNode(node: Text, pattern: RegExp): void {
  const text = node.nodeValue ?? ''
  pattern.lastIndex = 0
  if (!pattern.test(text)) return

  pattern.lastIndex = 0
  const fragment = document.createDocumentFragment()
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const matchStart = match.index
    const matchEnd = matchStart + match[0].length

    if (matchStart > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, matchStart)))
    }

    const mark = document.createElement('mark')
    mark.className = HIGHLIGHT_CLASS
    mark.textContent = match[0]
    fragment.appendChild(mark)

    lastIndex = matchEnd
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
  }

  node.parentNode?.replaceChild(fragment, node)
}

function walkAndHighlight(root: Node, pattern: RegExp): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      const tag = parent.tagName?.toLowerCase()
      if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'input') {
        return NodeFilter.FILTER_REJECT
      }
      if (parent.classList?.contains(HIGHLIGHT_CLASS)) {
        return NodeFilter.FILTER_REJECT
      }
      // nav/aside/header/footer の内部（サイドバー等）はスキップ
      // closest() で先祖要素まで遡って確認する
      if (parent.closest(EXCLUDED_ANCESTOR_SELECTORS)) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const textNodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode()) !== null) {
    textNodes.push(node as Text)
  }
  for (const textNode of textNodes) {
    highlightTextNode(textNode, pattern)
  }
}

function removeAllHighlights(): void {
  const marks = document.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_CLASS}`)
  for (const mark of marks) {
    const parent = mark.parentNode
    if (!parent) continue
    const text = document.createTextNode(mark.textContent ?? '')
    parent.replaceChild(text, mark)
    parent.normalize()
  }
}

// ---------------------------------------------------------------------------
// ナビゲーターバー
// ---------------------------------------------------------------------------

let allMarks: HTMLElement[] = []
let currentIndex = -1

/** ドラッグで移動できるバーを生成する */
function makeDraggable(el: HTMLElement): void {
  let dragging = false
  let offsetX = 0
  let offsetY = 0

  el.addEventListener('mousedown', (e) => {
    // ボタン上はドラッグしない（クリックとして扱う）
    if ((e.target as HTMLElement).closest('button')) return
    dragging = true

    // 初回ドラッグ: right ベースの座標を left ベースに変換して固定する
    const rect = el.getBoundingClientRect()
    el.style.right = 'auto'
    el.style.left = `${rect.left}px`
    el.style.top = `${rect.top}px`

    offsetX = e.clientX - rect.left
    offsetY = e.clientY - rect.top
    el.classList.add('dragging')
    e.preventDefault()
  })

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return
    const maxX = window.innerWidth - el.offsetWidth
    const maxY = window.innerHeight - el.offsetHeight
    const x = Math.max(0, Math.min(maxX, e.clientX - offsetX))
    const y = Math.max(0, Math.min(maxY, e.clientY - offsetY))
    el.style.left = `${x}px`
    el.style.top = `${y}px`
  })

  document.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    el.classList.remove('dragging')
  })
}

function getOrCreateNavigator(): HTMLElement {
  const existing = document.getElementById(NAVIGATOR_ID)
  if (existing) return existing

  const nav = document.createElement('div')
  nav.id = NAVIGATOR_ID

  const label = document.createElement('span')
  label.className = 'word-nav-label'
  label.textContent = 'Word'

  const prevBtn = document.createElement('button')
  prevBtn.type = 'button'
  prevBtn.textContent = '◀'
  prevBtn.addEventListener('click', navigatePrev)

  const count = document.createElement('span')
  count.className = 'word-nav-count'

  const nextBtn = document.createElement('button')
  nextBtn.type = 'button'
  nextBtn.textContent = '▶'
  nextBtn.addEventListener('click', navigateNext)

  nav.appendChild(label)
  nav.appendChild(prevBtn)
  nav.appendChild(count)
  nav.appendChild(nextBtn)

  makeDraggable(nav)

  document.body.appendChild(nav)
  return nav
}

function updateNavigatorDisplay(): void {
  const nav = document.getElementById(NAVIGATOR_ID)
  if (!nav) return

  const count = nav.querySelector<HTMLElement>('.word-nav-count')
  const buttons = nav.querySelectorAll('button')
  const prevBtn = buttons[0]
  const nextBtn = buttons[1]
  if (!count || !prevBtn || !nextBtn) return

  const total = allMarks.length
  const hasMatches = total > 0

  count.textContent = currentIndex >= 0 ? `${currentIndex + 1} / ${total}件` : `${total}件`
  prevBtn.disabled = !hasMatches
  nextBtn.disabled = !hasMatches
}

function navigateTo(index: number): void {
  if (currentIndex >= 0 && currentIndex < allMarks.length) {
    allMarks[currentIndex].classList.remove(CURRENT_CLASS)
  }
  currentIndex = index
  const mark = allMarks[currentIndex]
  if (!mark) return
  mark.classList.add(CURRENT_CLASS)
  mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
  updateNavigatorDisplay()
}

function navigateNext(): void {
  if (allMarks.length === 0) return
  navigateTo(currentIndex < 0 ? 0 : (currentIndex + 1) % allMarks.length)
}

function navigatePrev(): void {
  if (allMarks.length === 0) return
  navigateTo(
    currentIndex < 0
      ? allMarks.length - 1
      : (currentIndex - 1 + allMarks.length) % allMarks.length,
  )
}

// ---------------------------------------------------------------------------
// MutationObserver（モジュール変数として保持し、apply 中は disconnect する）
// ---------------------------------------------------------------------------

let observer: MutationObserver | null = null

const OBSERVE_OPTIONS: MutationObserverInit = {
  childList: true,
  subtree: true,
  characterData: true,
}

function connectObserver(): void {
  observer?.observe(document.body, OBSERVE_OPTIONS)
}

function disconnectObserver(): void {
  observer?.disconnect()
}

// ---------------------------------------------------------------------------
// メインロジック
// ---------------------------------------------------------------------------

let currentWords: string[] = []

/** ページ全体にハイライトを適用し直す。
 *  Observer を一時停止することで自己トリガーループを防ぐ。 */
function applyHighlights(): void {
  // 自身の DOM 変更で Observer が再トリガーしないよう切断
  disconnectObserver()

  removeAllHighlights()
  const pattern = buildPattern(currentWords)
  if (pattern) {
    walkAndHighlight(document.body, pattern)
  }

  // ハイライト再適用後はカレント位置をリセット（DOM が入れ替わるため参照が無効）
  allMarks = Array.from(document.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_CLASS}`))
  currentIndex = -1

  if (currentWords.length > 0) {
    getOrCreateNavigator()
    updateNavigatorDisplay()
  } else {
    document.getElementById(NAVIGATOR_ID)?.remove()
  }

  // 描画フレームの後に再接続（DOM が安定してから監視を再開）
  requestAnimationFrame(connectObserver)
}

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: T) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

const debouncedApply = debounce(applyHighlights, 200)

function startObserver(): void {
  if (observer) return

  observer = new MutationObserver((mutations) => {
    const hasRelevantChange = mutations.some((m) => {
      // ナビゲーターバー内の変更（count.textContent 更新など）は無視する
      const targetEl = m.target instanceof Element ? m.target : m.target.parentElement
      if (targetEl?.closest(`#${NAVIGATOR_ID}`)) return false

      if (m.addedNodes.length === 0 && m.type !== 'characterData') return false
      for (const node of m.addedNodes) {
        if (node instanceof Element && node.id === NAVIGATOR_ID) return false
        if (node instanceof Element && node.classList.contains(HIGHLIGHT_CLASS)) return false
      }
      return true
    })
    if (hasRelevantChange) debouncedApply()
  })

  connectObserver()
}

async function init(): Promise<void> {
  injectStyle()

  const result = await chrome.storage.sync.get({ [STORAGE_KEY]: [] })
  currentWords = result[STORAGE_KEY] as string[]

  applyHighlights()
  startObserver()

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !(STORAGE_KEY in changes)) return
    currentWords = (changes[STORAGE_KEY].newValue as string[]) ?? []
    applyHighlights()
  })
}

void init()
