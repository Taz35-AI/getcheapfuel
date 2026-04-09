'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem('cookie-consent', 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-gray-900 text-white px-4 py-3 shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-sm flex-1">
          We use essential cookies to make this site work. No tracking or advertising cookies.
          See our{' '}
          <Link href="/privacy" className="underline hover:text-green-400">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="px-3 py-1.5 text-sm rounded border border-gray-500 hover:bg-gray-800 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-3 py-1.5 text-sm rounded bg-green-600 hover:bg-green-700 font-medium transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
