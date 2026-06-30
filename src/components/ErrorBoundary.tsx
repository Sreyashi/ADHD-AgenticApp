import { Component, ErrorInfo, ReactNode } from 'react';
import { track } from '@vercel/analytics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    track('app_crash', {
      message: error.message,
      componentStack: info.componentStack?.slice(0, 500) ?? '',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="text-center max-w-sm">
            <p className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</p>
            <p className="text-sm text-slate-500 mb-4">Please refresh the page to keep using the app. Your data is still saved on this device.</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
