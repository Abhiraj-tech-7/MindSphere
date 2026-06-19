import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught:", error, info);
    }
  }
  reload = () => window.location.reload();
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#050508] text-white p-6" data-testid="error-boundary">
          <div className="max-w-md text-center rounded-3xl p-8 border border-white/10 bg-white/[0.02]">
            <div className="text-5xl mb-3">🫁</div>
            <h2 className="font-display text-2xl mb-2">Something went a bit wrong.</h2>
            <p className="text-sm text-white/65 mb-6">Lyra is taking a breath. Refresh and we'll be right back.</p>
            <button
              onClick={this.reload}
              data-testid="error-reload"
              className="px-6 py-2.5 rounded-full bg-purple-400 text-black font-medium hover:scale-[1.02] transition"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV !== "production" && (
              <pre className="text-[10px] text-white/30 mt-4 text-left whitespace-pre-wrap break-all">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
