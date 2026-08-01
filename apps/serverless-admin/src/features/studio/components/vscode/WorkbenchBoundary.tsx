import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  message: string
}

/**
 * Keeps a workbench failure inside the Code pane.
 *
 * VS Code's start-up touches a lot of global state, and an error thrown during
 * it would otherwise unmount the whole console — leaving a blank page and the
 * detail only in the browser console.
 */
export class WorkbenchBoundary extends Component<Props, State> {
  override state: State = { message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Function Studio: the VS Code workbench failed to start', error, info)
  }

  override render(): ReactNode {
    if (this.state.message) {
      return (
        <div className="fs-wb-loading fs-wb-failed">
          <strong>The editor failed to start.</strong>
          <code>{this.state.message}</code>
          <button
            type="button"
            className="fs-btn fs-btn-sm"
            onClick={() => {
              // Services are global and one-shot, so a retry has to be a reload.
              window.location.reload()
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
