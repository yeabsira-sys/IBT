import { Component } from "react";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Mesob Error Boundary:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="container">
          <section className="error-page">
            <div className="error-page__icon" aria-hidden="true">
              <FiAlertTriangle />
            </div>

            <p className="section-heading__eyebrow">Mesob House</p>

            <h1>Something went wrong</h1>

            <p>We couldn't display this page correctly. Please try again.</p>

            <button
              type="button"
              className="btn btn--primary"
              onClick={this.handleRetry}
            >
              <FiRefreshCw aria-hidden="true" />
              Try Again
            </button>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-page__details">
                <summary>Developer details</summary>
                <pre>{this.state.error.toString()}</pre>
              </details>
            )}
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
