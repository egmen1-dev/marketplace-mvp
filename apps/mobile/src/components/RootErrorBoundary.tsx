import React from "react";

import { recordFatalStartupError } from "../boot/early-boot";
import { StartupFatalErrorScreen } from "../features/startup/StartupFatalErrorScreen";

type Props = { children: React.ReactNode };
type State = { error: Error | null; componentStack: string | null };

/** Outermost React error boundary — shows Startup Fatal Error instead of closing the app. */
export class RootErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    recordFatalStartupError(error, "boundary");
    this.setState({ componentStack: info.componentStack ?? null });
    console.error("[LOT] RootErrorBoundary", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null, componentStack: null });
  };

  render() {
    if (this.state.error) {
      return (
        <StartupFatalErrorScreen
          error={this.state.error}
          componentStack={this.state.componentStack}
          onRetry={this.retry}
        />
      );
    }
    return this.props.children;
  }
}

/** @deprecated Use RootErrorBoundary */
export const ErrorBoundary = RootErrorBoundary;
