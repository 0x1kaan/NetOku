import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureError } from '@/lib/monitoring';
import { ServerError } from '@/pages/ServerError';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    captureError(error, { componentStack: info.componentStack ?? undefined });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return this.props.fallback ?? <ServerError error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
