import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center bg-background">
          <h1 className="font-display text-lg font-semibold">Что-то пошло не так</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Приложение столкнулось с непредвиденной ошибкой. Попробуйте
            перезагрузить страницу. Если проблема повторится — сообщите
            разработчику.
          </p>
          <pre className="max-w-md overflow-auto rounded-xl border border-border-muted bg-surface p-3 text-left text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110 active:scale-[0.98]"
          >
            Перезагрузить
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
