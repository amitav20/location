/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Catches render crashes so the user sees a recoverable message instead of a white screen.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center space-y-4">
            <h1 className="text-lg font-bold text-gray-800">Something went wrong</h1>
            <p className="text-sm text-gray-500">{this.state.error.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
