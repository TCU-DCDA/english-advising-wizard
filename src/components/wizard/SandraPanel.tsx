import { useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

const SANDRA_ORIGIN = import.meta.env.DEV ? 'http://127.0.0.1:5002' : 'https://sandra.digitcu.org'
const SANDRA_URL = SANDRA_ORIGIN + '?embed=true'

interface SandraPanelProps {
  open: boolean
  onClose: () => void
  wizardContext: string | null
}

export function SandraPanel({ open, onClose, wizardContext }: SandraPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const sendContext = useCallback(() => {
    if (iframeRef.current?.contentWindow && wizardContext) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'wizard-context', context: wizardContext, department: 'English' },
        SANDRA_ORIGIN
      )
    }
  }, [wizardContext])

  // Send context when panel opens or context changes
  useEffect(() => {
    if (open) sendContext()
  }, [open, sendContext])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[400px] bg-card z-50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
          <div>
            <p className="font-semibold text-sm">Ask Sandra</p>
            <p className="text-xs text-primary-foreground/70">AI advising assistant</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close Sandra panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* iframe */}
        <iframe
          ref={iframeRef}
          src={SANDRA_URL}
          onLoad={sendContext}
          className="flex-1 w-full border-0"
          title="Sandra AI Advisor"
          allow="clipboard-write"
        />
      </div>
    </>
  )
}
