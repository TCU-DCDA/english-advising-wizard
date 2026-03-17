import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

vi.mock('@/services/analytics', () => ({
  trackWizardStart: vi.fn(),
  trackStepVisit: vi.fn(),
  trackExport: vi.fn(),
  recordAnonymousSubmission: vi.fn(),
}))

describe('App smoke flow', () => {
  beforeEach(() => {
    localStorage.clear()
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

  it('enforces setup gating and advances to save & submit', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Your name' })).toBeInTheDocument()

    const nextButton = screen.getByRole('button', { name: 'Next' })
    expect(nextButton).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'Test Student' },
    })
    fireEvent.change(screen.getByPlaceholderText('name@tcu.edu'), {
      target: { value: 'test@tcu.edu' },
    })
    fireEvent.click(screen.getByRole('button', { name: /English/ }))

    const termButton = screen
      .getAllByRole('button')
      .find((button) => /(Spring|Summer|Fall)\s*20\d{2}/.test(button.textContent ?? ''))

    expect(termButton).toBeDefined()
    fireEvent.click(termButton!)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(
      screen.getByText(/check the courses you've already completed/i)
    ).toBeInTheDocument()

    // Mark each category as "Skip/Not yet" so completed-step validation passes.
    let safety = 0
    while (screen.queryAllByText('Skip').length > 0 && safety < 30) {
      fireEvent.click(screen.getAllByText('Skip')[0])
      safety += 1
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled()
    })

    // Continue through remaining wizard steps until submit view (no Next button).
    let nextClicks = 0
    while (screen.queryByRole('button', { name: 'Next' }) && nextClicks < 10) {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
      nextClicks += 1
    }

    expect(await screen.findByText('Save & Submit')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })
})
