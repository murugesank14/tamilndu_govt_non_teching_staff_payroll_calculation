import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global Error Boundary Caught:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 p-6 text-center bg-red-100 rounded-xl border border-red-200">
          <h2 className="text-red-700 font-bold text-lg">⚠️ Application Error</h2>
          <p className="text-gray-700 mt-2">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
           <p className="text-sm text-gray-500 mt-4">Please try refreshing the page. If the problem persists, check the developer console for more details.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
