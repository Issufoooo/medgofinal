import { Component } from 'react'

/**
 * ErrorBoundary — catches unhandled React render errors.
 * Wraps around routes and key dashboard sections.
 * Without this, any uncaught error shows the user a blank white screen.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // Forward to error monitoring (Sentry, etc.) if available
    if (typeof window.__sentryHub !== 'undefined') {
      window.__sentryHub.captureException(error, { extra: errorInfo })
    }
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { fallback, minimal } = this.props

    // Custom fallback provided by the parent
    if (fallback) return fallback

    // Minimal inline error (for widgets/cards)
    if (minimal) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-semibold text-red-700">Erro ao carregar este bloco.</p>
          <button
            onClick={this.handleReset}
            className="mt-2 text-xs text-red-600 underline hover:text-red-800"
          >
            Tentar novamente
          </button>
        </div>
      )
    }

    // Full-page error
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Algo correu mal</h1>
            <p className="mt-2 text-sm text-slate-500">
              Ocorreu um erro inesperado. Por favor recarregue a página.
              Se o problema persistir, contacte o suporte.
            </p>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details className="text-left rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Detalhes do erro (só em desenvolvimento)
              </summary>
              <pre className="mt-3 text-xs text-red-700 overflow-auto max-h-48 whitespace-pre-wrap">
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="btn-secondary"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-primary"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    )
  }
}

/**
 * Convenience wrapper for functional components.
 * Usage: <WithErrorBoundary minimal><SomeWidget /></WithErrorBoundary>
 */
export function WithErrorBoundary({ children, minimal = false, fallback }) {
  return (
    <ErrorBoundary minimal={minimal} fallback={fallback}>
      {children}
    </ErrorBoundary>
  )
}
