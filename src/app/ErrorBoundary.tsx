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
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-lg font-semibold">Что-то пошло не так</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Приложение столкнулось с непредвиденной ошибкой. Попробуйте
            перезагрузить страницу. Если проблема повторится — сообщите
            разработчику.
          </p>
          <pre className="max-w-md overflow-auto rounded bg-muted p-3 text-left text-xs">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Перезагрузить
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
