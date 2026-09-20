import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  BookOpen,
  Check,
  FileText,
  LoaderCircle,
  MessageSquareText,
  Moon,
  PanelLeft,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import './App.css'

const configuredApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
const API_URL = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Something went wrong.')
  return data
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authLoading, setAuthLoading] = useState(true)
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [isRailOpen, setIsRailOpen] = useState(() => window.matchMedia('(min-width: 721px)').matches)
  const [theme, setTheme] = useState(() => localStorage.getItem('index-ask-theme') || 'light')
  const [pendingQuestion, setPendingQuestion] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    apiRequest('/auth/me').then((data) => { setUser(data.user) }).catch(() => {}).finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    if (user) loadChats()
  }, [user])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('index-ask-theme', theme)
  }, [theme])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages, pendingQuestion])

  async function loadChats() {
    setIsLoading(true)
    try {
      const data = await apiRequest('/chats')
      setChats(data.chats)
      if (data.chats.length) await selectChat(data.chats[0].id)
      else await createChat()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function submitAuth(event) {
    event.preventDefault()
    setError('')
    setAuthLoading(true)
    try {
      const data = await apiRequest(`/auth/${authMode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authForm) })
      setUser(data.user)
      setAuthForm({ name: '', email: '', password: '' })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function logout() {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
    setChats([])
    setActiveChat(null)
  }

  async function selectChat(chatId) {
    try {
      const chat = await apiRequest(`/chats/${chatId}`)
      setActiveChat(chat)
      setPendingQuestion(null)
      if (window.innerWidth <= 720) setIsRailOpen(false)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function createChat() {
    try {
      const data = await apiRequest('/chats', { method: 'POST' })
      const chat = await apiRequest(`/chats/${data.chatId}`)
      setChats((current) => [chat, ...current.filter((item) => item.id !== chat.id)])
      setActiveChat(chat)
      setPendingQuestion(null)
      if (window.innerWidth <= 720) setIsRailOpen(false)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function removeChat(chatId) {
    try {
      await apiRequest(`/chats/${chatId}`, { method: 'DELETE' })
      const remaining = chats.filter((chat) => chat.id !== chatId)
      setChats(remaining)
      if (activeChat?.id === chatId) {
        if (remaining.length) await selectChat(remaining[0].id)
        else await createChat()
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function uploadDocument(file) {
    if (!file || !activeChat) return
    setIsUploading(true)
    setError('')
    const body = new FormData()
    body.append('file', file)
    try {
      await apiRequest(`/chats/${activeChat.id}/document`, { method: 'POST', body })
      await selectChat(activeChat.id)
      const data = await apiRequest('/chats')
      setChats(data.chats)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsUploading(false)
    }
  }

  async function sendQuestion(event) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || !activeChat || isSending || !activeChat.document) return
    setIsSending(true)
    setError('')
    setQuestion('')
    setPendingQuestion({ id: `pending-${Date.now()}`, role: 'user', content: trimmed, timestamp: new Date().toISOString() })
    try {
      await apiRequest(`/chats/${activeChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })
      await selectChat(activeChat.id)
      const data = await apiRequest('/chats')
      setChats(data.chats)
      setPendingQuestion(null)
    } catch (requestError) {
      setQuestion(trimmed)
      setPendingQuestion(null)
      setError(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  const messages = activeChat?.messages || []
  const displayedMessages = pendingQuestion ? [...messages, pendingQuestion] : messages

  if (authLoading) return <div className="auth-screen"><LoaderCircle className="spin" size={24} /><span>Checking your session...</span></div>

  if (!user) return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand auth-brand"><span className="brand-mark"><Sparkles size={16} /></span><span>Index / Ask</span></div>
        <p className="eyebrow">PRIVATE DOCUMENT INTELLIGENCE</p>
        <h1>{authMode === 'login' ? 'Welcome back.' : 'Create your workspace.'}</h1>
        <p className="auth-copy">Your documents and conversations belong to your account and stay scoped to your workspace.</p>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={submitAuth}>
          {authMode === 'register' && <label>Name<input required value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} placeholder="Your name" /></label>}
          <label>Email<input required type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com" /></label>
          <label>Password<input required type="password" minLength="8" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="At least 8 characters" /></label>
          <button className="primary-button auth-submit" type="submit">{authMode === 'login' ? 'Log in' : 'Create account'}</button>
        </form>
        <button className="auth-switch" type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError('') }}>{authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}</button>
      </section>
    </main>
  )

  return (
    <main className="app-shell">
      <aside className={`chat-rail ${isRailOpen ? '' : 'collapsed'}`}>
        <div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>Index / Ask</span></div>
        <button className="new-chat" type="button" onClick={createChat}><Plus size={17} /> New conversation</button>
        <div className="rail-heading"><span>Library</span><span>{chats.length}</span></div>
        <div className="chat-list">
          {chats.map((chat) => (
            <div className={`chat-row ${activeChat?.id === chat.id ? 'active' : ''}`} key={chat.id}>
              <button type="button" className="chat-select" onClick={() => selectChat(chat.id)}>
                <MessageSquareText size={16} />
                <span><strong>{chat.title}</strong><small>{chat.document ? `${chat.document.pages} pages` : 'Awaiting a document'}</small></span>
              </button>
              <button type="button" className="icon-button subtle" aria-label={`Delete ${chat.title}`} onClick={() => removeChat(chat.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="rail-footer"><span className="status-dot" /> Local workspace</div>
      </aside>
      {isRailOpen && <button className="rail-backdrop" type="button" aria-label="Close sidebar" onClick={() => setIsRailOpen(false)} />}

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button" type="button" aria-label="Toggle sidebar" onClick={() => setIsRailOpen((open) => !open)}><PanelLeft size={18} /></button>
          <div className="crumb"><span>Workspace</span><span>/</span><strong>{activeChat?.title || 'New conversation'}</strong></div>
          <div className="account-actions"><span className="user-name">{user.name}</span><button className="theme-button" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button><button className="logout-button" type="button" onClick={() => setShowLogoutConfirm(true)}>Log out</button></div>
        </header>

        {error && <div className="error-banner"><X size={16} /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}

        <div className="content-wrap">
          <div className="content-header">
            <div><p className="eyebrow">DOCUMENT INTELLIGENCE</p><h1>{activeChat?.document ? activeChat.document.fileName : 'Bring a document into focus'}</h1><p className="subhead">Ask grounded questions and get answers traced back to your source.</p></div>
            {activeChat?.document && <div className="doc-badge"><Check size={14} /> Indexed</div>}
          </div>

          {!activeChat?.document ? (
            <div className="upload-stage">
              <div className="upload-panel">
                <div className="upload-icon"><Upload size={23} /></div>
                <h2>Start with one PDF</h2>
                <p>Upload a report, brief, or paper. Your conversation stays scoped to this document.</p>
                <button className="primary-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>{isUploading ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />} {isUploading ? 'Indexing document...' : 'Choose PDF'}</button>
                <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => uploadDocument(event.target.files?.[0])} />
                <span className="upload-note">PDF only · up to 30 MB</span>
              </div>
            </div>
          ) : (
            <>
              <div className="document-strip"><FileText size={18} /><span>{activeChat.document.fileName}</span><span className="separator" /><span>{activeChat.document.pages} pages</span><span className="separator" /><span>{activeChat.document.chunks} chunks</span><button className="icon-button" type="button" aria-label="Refresh conversation" onClick={() => selectChat(activeChat.id)}><RefreshCw size={15} /></button></div>
              <div className="thread">
                {displayedMessages.length === 0 && <div className="empty-thread"><div className="empty-icon"><BookOpen size={21} /></div><h2>What would you like to know?</h2><p>Ask for a summary, find a specific detail, or compare ideas in the document.</p><div className="suggestions"><button type="button" onClick={() => setQuestion('Summarize the key points in this document.')}>Summarize the key points</button><button type="button" onClick={() => setQuestion('What are the main conclusions?')}>Find the main conclusions</button></div></div>}
                {displayedMessages.map((message) => <article className={`message ${message.role} ${message.id === pendingQuestion?.id ? 'pending' : ''}`} key={message.id}><div className="message-label">{message.role === 'user' ? 'You' : 'Index / Ask'}<span>{formatDate(message.timestamp)}</span></div><div className="message-body">{message.content}</div>{message.sources?.length > 0 && <div className="sources"><span>Sources</span>{message.sources.map((source, index) => <span className="source" key={`${source.page}-${index}`}><FileText size={12} /> p. {source.page}</span>)}</div>}</article>)}
                {isSending && <article className="message assistant"><div className="message-label">Index / Ask</div><div className="thinking"><span /><span /><span /></div></article>}
                <div ref={messagesEndRef} />
              </div>
              <form className="composer" onSubmit={sendQuestion}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendQuestion(event) } }} placeholder="Ask anything about your document..." rows="1" disabled={isSending} /><button className="send-button" type="submit" aria-label="Send question" disabled={!question.trim() || isSending}><ArrowUp size={18} /></button><span className="composer-hint">Enter to send · Shift + Enter for a new line</span></form>
            </>
          )}
        </div>
        <footer className="workspace-footer"><span><span className="status-dot" /> Powered by your private document index</span><span><Search size={13} /> Answers are generated from retrieved passages</span></footer>
      </section>
      {showLogoutConfirm && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowLogoutConfirm(false)}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="logout-title">Log out?</h2><p>Your current session will be closed on this device.</p><div className="confirm-actions"><button className="cancel-button" type="button" onClick={() => setShowLogoutConfirm(false)}>Cancel</button><button className="confirm-logout" type="button" onClick={() => { setShowLogoutConfirm(false); logout() }}>Log out</button></div></section></div>}
      {isLoading && <div className="loading-screen"><LoaderCircle className="spin" size={24} /><span>Opening your workspace...</span></div>}
    </main>
  )
}

export default App
