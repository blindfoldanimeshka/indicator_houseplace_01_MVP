// Apply persisted accent color before React mounts
try {
  const saved = localStorage.getItem('skvot-accent')
  if (saved === 'purple' || saved === 'lime' || saved === 'cyan') {
    document.documentElement.style.setProperty(
      '--color-primary',
      saved === 'lime' ? '#C6FF33' : saved === 'cyan' ? '#22D3EE' : '#7D39EB',
    )
  }
} catch { /* localStorage unavailable */ }

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
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

