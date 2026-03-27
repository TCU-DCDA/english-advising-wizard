import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EngelinaPanel } from './EngelinaPanel'
import { WizardShell } from './WizardShell'
import type { WizardPhase } from '@/types'

describe('Engelina chat smoke tests', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('engelina-session-id', 'test-session-id')

    Object.defineProperty(window, 'scrollTo', {
      value: vi.fn(),
      writable: true,
    })

    if (!Element.prototype.scrollIntoView) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', {
        value: vi.fn(),
        writable: true,
      })
    } else {
      vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens chat panel from WizardShell Ask Engelina button', () => {
    const phases: { key: WizardPhase; label: string; stepCount: number }[] = [
      { key: 'setup', label: 'Setup', stepCount: 1 },
    ]

    const { container } = render(
      <WizardShell
        currentPhase="setup"
        currentStepInPhase={0}
        phases={phases}
        canGoBack={false}
        canGoNext={true}
        onBack={vi.fn()}
        onNext={vi.fn()}
        chatContext="wizard context"
        chatProgramName="English"
        chatProgramId="english"
      >
        <div>Step content</div>
      </WizardShell>
    )

    expect(container.querySelectorAll('div[aria-hidden="true"]').length).toBe(0)

    fireEvent.click(screen.getByLabelText(/ask engelina for help/i))

    expect(container.querySelectorAll('div[aria-hidden="true"]').length).toBe(1)
  })

  it('sends a chat message and renders assistant response', async () => {
    // Build an SSE stream that the component's reader will consume
    const ssePayload = [
      'event: text\ndata: {"text":"You should take ENGL 20503 next semester."}\n\n',
      'event: done\ndata: {"programMentions":[],"conversationHistory":[{"role":"user","content":"What should I take next?"},{"role":"assistant","content":"You should take ENGL 20503 next semester."}]}\n\n',
    ].join('')

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(ssePayload))
        controller.close()
      },
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <EngelinaPanel
        open={true}
        onClose={vi.fn()}
        wizardContext="english major context"
        programName="English"
        programId="english"
      />
    )

    fireEvent.change(screen.getByPlaceholderText(/ask about your courses, requirements/i), {
      target: { value: 'What should I take next?' },
    })
    fireEvent.click(screen.getByLabelText(/send message/i))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const request = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(request.body))
    expect(body.message).toBe('What should I take next?')
    expect(body.wizardContext).toBe('english major context')

    await waitFor(() => {
      expect(screen.getByText('You should take ENGL 20503 next semester.')).toBeInTheDocument()
    })
  })
})
