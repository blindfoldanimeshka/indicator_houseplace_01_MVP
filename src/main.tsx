import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { App } from '@/app/App'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import '@/styles/index.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Не найден контейнер #root.')
}

createRoot(root).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </MotionConfig>
  </StrictMode>,
)

