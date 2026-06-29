"use client"

import { Component, type ReactNode } from "react"
import Link from "next/link"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center p-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-zinc-400 text-sm text-center">Something went wrong</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-6 py-2.5 rounded-xl bg-[--tg-button,#8774e1] text-white font-semibold text-sm"
            >
              Try again
            </button>
            <Link
              href="/"
              className="text-sm text-zinc-500 underline"
            >
              Go home
            </Link>
          </div>
        )
      )
    }

    return this.props.children
  }
}
