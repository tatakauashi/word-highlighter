const MAX_WORDS = 50
const MAX_WORD_LENGTH = 100
const STORAGE_KEY = 'specWords'
const ENABLED_KEY = 'highlighterEnabled'

const wordInput = document.getElementById('wordInput') as HTMLInputElement
const addBtn = document.getElementById('addBtn') as HTMLButtonElement
const wordList = document.getElementById('wordList') as HTMLUListElement
const errorMsg = document.getElementById('errorMsg') as HTMLParagraphElement
const emptyMsg = document.getElementById('emptyMsg') as HTMLParagraphElement
const countBadge = document.getElementById('countBadge') as HTMLSpanElement
const enabledToggle = document.getElementById('enabledToggle') as HTMLButtonElement

function loadWords(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: [] }, (result) => {
      resolve(result[STORAGE_KEY] as string[])
    })
  })
}

function saveWords(words: string[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: words }, resolve)
  })
}

function renderList(words: string[]): void {
  // 既存のリストアイテムをすべてクリア
  while (wordList.firstChild) {
    wordList.removeChild(wordList.firstChild)
  }

  countBadge.textContent = `${words.length} / ${MAX_WORDS}`
  emptyMsg.style.display = words.length === 0 ? 'block' : 'none'

  for (const word of words) {
    const li = document.createElement('li')
    li.className = 'word-item'

    const span = document.createElement('span')
    span.className = 'word-text'
    span.textContent = word // textContent を使用して XSS を防止

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'delete-btn'
    btn.textContent = '削除'
    btn.dataset['word'] = word
    btn.addEventListener('click', () => handleDelete(word))

    li.appendChild(span)
    li.appendChild(btn)
    wordList.appendChild(li)
  }
}

function showError(msg: string): void {
  errorMsg.textContent = msg
}

function clearError(): void {
  errorMsg.textContent = ''
}

async function handleAdd(): Promise<void> {
  const raw = wordInput.value
  const trimmed = raw.trim()

  if (trimmed.length === 0) {
    showError('ワードを入力してください')
    return
  }
  if (trimmed.length > MAX_WORD_LENGTH) {
    showError(`${MAX_WORD_LENGTH}文字以内で入力してください`)
    return
  }

  const words = await loadWords()

  if (words.length >= MAX_WORDS) {
    showError(`登録できるワードは最大${MAX_WORDS}件です`)
    return
  }
  if (words.includes(trimmed)) {
    showError('すでに登録されているワードです')
    return
  }

  clearError()
  words.push(trimmed)
  await saveWords(words)
  renderList(words)
  wordInput.value = ''
  wordInput.focus()
}

async function handleDelete(word: string): Promise<void> {
  const words = await loadWords()
  const updated = words.filter((w) => w !== word)
  await saveWords(updated)
  renderList(updated)
  clearError()
}

function setToggleState(enabled: boolean): void {
  enabledToggle.setAttribute('aria-checked', String(enabled))
}

async function handleToggle(): Promise<void> {
  const current = enabledToggle.getAttribute('aria-checked') === 'true'
  const next = !current
  setToggleState(next)
  await new Promise<void>((resolve) => {
    chrome.storage.sync.set({ [ENABLED_KEY]: next }, resolve)
  })
}

async function init(): Promise<void> {
  const [words, result] = await Promise.all([
    loadWords(),
    new Promise<boolean>((resolve) => {
      chrome.storage.sync.get({ [ENABLED_KEY]: true }, (r) => {
        resolve(r[ENABLED_KEY] as boolean)
      })
    }),
  ])
  renderList(words)
  setToggleState(result)

  addBtn.addEventListener('click', () => void handleAdd())
  wordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void handleAdd()
  })
  enabledToggle.addEventListener('click', () => void handleToggle())
}

void init()
