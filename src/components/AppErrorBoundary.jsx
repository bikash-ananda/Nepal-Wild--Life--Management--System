import React from "react";

export default class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("WLMS application render failed:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
          <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">WLMS could not open this page</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              An unexpected application error occurred. Your saved reports are not intentionally cleared.
              Reload the page to try again. If the problem continues, share the browser console error with the project administrator.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Reload WLMS
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
