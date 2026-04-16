/**
 * CookieBanner — minimum-viable privacy notice.
 *
 * Production Sprint 3.7. Single dismissible banner. GDPR-defensible for
 * small-site scale without a full Cookie Management Platform. Hidden
 * when Supabase is not wired (offline-only dev mode doesn't set cookies
 * for auth).
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseEnabled } from '@api/user'

const DISMISSED_KEY = 'toy-soldiers-cookie-banner-dismissed'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isSupabaseEnabled()) return
    if (typeof localStorage === 'undefined') return
    if (localStorage.getItem(DISMISSED_KEY) === '1') return
    setVisible(true)
  }, [])

  const handleDismiss = useCallback(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISMISSED_KEY, '1')
    }
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div className="cookie-banner">
      <span className="cookie-banner-text">
        We use cookies for sign-in and anonymous analytics.
        {' '}
        <Link to="/privacy" className="cookie-banner-link">Learn more</Link>
      </span>
      <button className="cookie-banner-btn" onClick={handleDismiss}>GOT IT</button>
    </div>
  )
}
