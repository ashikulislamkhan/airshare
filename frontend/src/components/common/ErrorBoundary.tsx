"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 m-4 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs">
          <p className="font-semibold text-sm text-red-400 mb-1">A component encountered an issue</p>
          <p className="font-mono text-[11px] text-red-300/80 mb-2">{this.state.error?.message || "Unknown error"}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs transition"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
