import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  handleResetAll = () => {
    localStorage.removeItem('english-wizard-student-data')
    localStorage.removeItem('english-wizard-step-index')
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-sm w-full text-center space-y-4">
            <AlertTriangle className="size-12 mx-auto text-amber-500" />
            <h1 className="text-xl font-semibold text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              Your saved data is safe. Try reloading, or reset the app if the
              problem persists.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={this.handleReset}>
                <RotateCcw className="size-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={this.handleResetAll}>
                Reset App
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
