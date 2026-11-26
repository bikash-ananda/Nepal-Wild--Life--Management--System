import React, { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error("WLMS page rendering failed", error, info); }
  render() {
    if (this.state.hasError) return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-12">
        <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-sm" role="alert">
          <h1 className="text-xl font-semibold text-slate-900">This page could not be displayed</h1>
          <p className="mt-2 text-sm text-slate-600">A page component encountered an unexpected error. Your saved records have not been changed. Reload the page and try again.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">Reload page</button>
            <a href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Go to dashboard</a>
          </div>
        </section>
      </main>
    );
    return this.props.children;
  }
}
