import { Component, type ErrorInfo, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Rendered when a child throws (a failed query, a render bug). Pass a
   * function to get a `retry` that clears the error and re-renders the
   * children: a boundary with no way out stays broken until its parent
   * remounts, which for a persistent pane means a full page reload.
   */
  fallback?: ReactNode | ((retry: () => void) => ReactNode);
  /** Called with the error. Default: `console.error` with the component stack. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Contains a failure to its own subtree, so one broken pane or subscription
 * cannot swap the whole layout for an error page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (this.props.onError) this.props.onError(error, info);
    else console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  private readonly retry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (typeof fallback === "function") return fallback(this.retry);
      return fallback ?? null;
    }
    return this.props.children;
  }
}
