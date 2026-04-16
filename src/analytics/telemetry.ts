/**
 * analytics/telemetry — PostHog + Sentry init, gated on env vars.
 *
 * No env keys → no SDKs load, no network calls. The app works identically
 * offline. This is load-bearing for the "no wall, ever" principle — even
 * without the analytics stack, `/camp` must boot and play.
 *
 * Env vars:
 *   VITE_POSTHOG_KEY   — PostHog Cloud project key. Missing = no events.
 *   VITE_POSTHOG_HOST  — optional (defaults to https://us.posthog.com)
 *   VITE_SENTRY_DSN    — Sentry DSN. Missing = no crash reporting.
 *
 * See production-plan.md, Subsystem 2.6.
 */

import posthog from 'posthog-js'
import * as Sentry from '@sentry/browser'

let posthogReady = false
let sentryReady = false

/**
 * Initialize analytics. Call once at app boot. Safe to call multiple times —
 * subsequent calls are no-ops. Works even when env vars are unset.
 */
export function initTelemetry(userId: string): void {
  const phKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  const phHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.posthog.com'
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

  if (phKey && !posthogReady) {
    try {
      posthog.init(phKey, {
        api_host: phHost,
        person_profiles: 'identified_only',
        capture_pageview: false,
        autocapture: false, // explicit events only
      })
      posthog.identify(userId)
      posthogReady = true
    } catch (err) {
      // Telemetry failure must never break the app.
      // eslint-disable-next-line no-console
      console.warn('[telemetry] PostHog init failed:', err)
    }
  }

  if (sentryDsn && !sentryReady) {
    try {
      Sentry.init({
        dsn: sentryDsn,
        tracesSampleRate: 0,  // no perf transactions in v1 — just crashes
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        environment: import.meta.env.MODE,
      })
      Sentry.setUser({ id: userId })
      sentryReady = true
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[telemetry] Sentry init failed:', err)
    }
  }

  if (import.meta.env.DEV && !phKey && !sentryDsn) {
    // eslint-disable-next-line no-console
    console.debug('[telemetry] Running without PostHog/Sentry (env keys unset).')
  }
}

/**
 * Capture an event. Thin wrapper so `events.ts` doesn't import posthog
 * directly. No-op when PostHog hasn't been initialized.
 */
export function postHogCapture(event: string, props: Record<string, unknown>): void {
  if (!posthogReady) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[telemetry] (no key) ${event}`, props)
    }
    return
  }
  try {
    posthog.capture(event, props)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[telemetry] capture failed:', err)
  }
}
