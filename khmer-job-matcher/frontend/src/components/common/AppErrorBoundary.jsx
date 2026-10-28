import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) { return { error } }

  componentDidMount() { window.__KHMER_APP_STARTED__ = true }

  componentDidCatch(error, info) { console.error('Application render failed:', error, info.componentStack) }

  render() {
    if (this.state.error) return <section role="alert" style={{ maxWidth: 650, margin: '60px auto', padding: 28, background: '#fff', border: '1px solid #e5d8f1', borderRadius: 16, fontFamily: 'Segoe UI, sans-serif', color: '#352344' }}>
      <h1 style={{ fontSize: 24 }}>The page could not open</h1><p style={{ margin: '14px 0', color: '#665575' }}>Please reload the page. If this message returns, send the error below so we can fix it.</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 14, background: '#f8f4fc', borderRadius: 8 }}>{this.state.error.message || 'An unexpected rendering error occurred.'}</pre><button style={{ marginTop: 18, padding: '10px 18px', background: '#69369d', color: 'white', border: 0, borderRadius: 7 }} onClick={() => window.location.reload()}>Reload page</button><a href="/" style={{ marginLeft: 18 }}>Return to website</a>
    </section>
    return this.props.children
  }
}
