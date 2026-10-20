"use client";

import { Component } from "react";
import ErrorFallback from "./ErrorFallback";

/**
 * ErrorBoundary — contains a failure inside ONE island (e.g. a lazily-loaded
 * checkout card whose chunk failed to download) so the rest of the page keeps
 * working. Whole-route failures are handled by app/error.jsx instead.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          compact
          title="This section couldn't load"
          message="Something went wrong loading this part of the page."
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
