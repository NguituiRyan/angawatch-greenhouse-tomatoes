import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { queryClient } from './lib/queryClient'
import './index.css'

/**
 * Start the MSW mock layer so every screen renders from realistic tomato data
 * out of the box — no backend required. Failure to start (e.g. worker not
 * generated) is non-fatal: the app still loads.
 */
async function enableMocking() {
  if (import.meta.env.VITE_DISABLE_MOCKS === 'true') return
  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[AngaWatch] MSW mocks failed to start; run `npm run mocks:init`.', err)
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  )
})
