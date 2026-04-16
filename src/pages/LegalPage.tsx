/**
 * LegalPage — shared layout for /privacy, /terms, /refund.
 *
 * Production Sprint 3.7. Plain-language templates. Replace the
 * `<COMPANY>` / `<CONTACT_EMAIL>` placeholders before going live in
 * production. Jurisdiction clauses are intentionally generic — a
 * lawyer should review before launch in a paid market.
 */

import { Link } from 'react-router-dom'

interface LegalPageProps {
  kind: 'privacy' | 'terms' | 'refund'
}

const COMPANY = 'Toy Soldiers AI'
const CONTACT = 'support@toysoldiers.ai'
const UPDATED = 'April 2026'

export function LegalPage({ kind }: LegalPageProps) {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={navStyle}>
          <Link to="/camp" style={linkStyle}>← Back to game</Link>
          <div>
            <Link to="/privacy" style={navLinkStyle}>Privacy</Link>
            <Link to="/terms" style={navLinkStyle}>Terms</Link>
            <Link to="/refund" style={navLinkStyle}>Refunds</Link>
          </div>
        </div>

        {kind === 'privacy' && <PrivacyContent />}
        {kind === 'terms' && <TermsContent />}
        {kind === 'refund' && <RefundContent />}

        <div style={footerStyle}>
          {COMPANY} · Last updated {UPDATED} · Contact <a href={`mailto:${CONTACT}`} style={linkStyle}>{CONTACT}</a>
        </div>
      </div>
    </div>
  )
}

// ── Content blocks ──────────────────────────────────────────────────────

function PrivacyContent() {
  return (
    <>
      <h1 style={h1Style}>Privacy Policy</h1>
      <p>
        This policy describes what {COMPANY} ("we", "us") collects when you play
        our game, how we use that information, and your rights over it.
      </p>

      <h2 style={h2Style}>What we collect</h2>
      <p>When you play as a guest:</p>
      <ul>
        <li>A random anonymous identifier stored in your browser, used only to keep your camp state consistent across sessions on this device.</li>
        <li>Your in-game progress: tokens, soldiers, battles completed, training history. This lives in your browser's localStorage and (if you have chosen to save your progress) in our cloud database (Supabase).</li>
      </ul>
      <p>If you choose "Save your progress" to create an account:</p>
      <ul>
        <li>Your email address (Google OAuth or magic-link login).</li>
        <li>The same in-game progress as above, now associated with that email.</li>
      </ul>
      <p>If you purchase a token pack:</p>
      <ul>
        <li>Payment is processed by Stripe. We never see or store your card details.</li>
        <li>We record the transaction (pack id, token amount, timestamp, Stripe session id) for fulfillment, refund handling, and legal record-keeping.</li>
      </ul>
      <p>Analytics and crash reporting (both optional):</p>
      <ul>
        <li><strong>PostHog</strong> — anonymous event funnel data (e.g. tutorial completed, battle started). No personal content is captured.</li>
        <li><strong>Sentry</strong> — crash reports with stack traces. No personal content is captured unless it appears inside a thrown error message.</li>
      </ul>

      <h2 style={h2Style}>How we use it</h2>
      <p>We use this information to run the game, to let you log in across devices, to deliver tokens you've purchased, to understand how players experience the game, and to investigate crashes. We do not sell your data.</p>

      <h2 style={h2Style}>Third parties</h2>
      <ul>
        <li><strong>Supabase</strong> (auth + database) — <a href="https://supabase.com/privacy" style={linkStyle}>supabase.com/privacy</a></li>
        <li><strong>Stripe</strong> (payment processing) — <a href="https://stripe.com/privacy" style={linkStyle}>stripe.com/privacy</a></li>
        <li><strong>PostHog</strong> (analytics) — <a href="https://posthog.com/privacy" style={linkStyle}>posthog.com/privacy</a></li>
        <li><strong>Sentry</strong> (crash reporting) — <a href="https://sentry.io/privacy/" style={linkStyle}>sentry.io/privacy</a></li>
        <li><strong>Google</strong> (OAuth sign-in, optional) — <a href="https://policies.google.com/privacy" style={linkStyle}>policies.google.com/privacy</a></li>
      </ul>

      <h2 style={h2Style}>Your rights</h2>
      <p>You can:</p>
      <ul>
        <li>Play without ever creating an account. Guest mode is not deprecated and never will be.</li>
        <li>Delete your account and all associated data by emailing <a href={`mailto:${CONTACT}`} style={linkStyle}>{CONTACT}</a>.</li>
        <li>Export your data on request.</li>
        <li>Opt out of analytics by enabling "Do Not Track" in your browser (we respect it).</li>
      </ul>

      <h2 style={h2Style}>Children</h2>
      <p>This game is not directed at children under 13. Before any real-money purchase, we ask you to confirm you are 13 or older. We do not knowingly collect data from children under 13.</p>

      <h2 style={h2Style}>Changes</h2>
      <p>If we materially change this policy, we will post a notice in-game before the change takes effect.</p>
    </>
  )
}

function TermsContent() {
  return (
    <>
      <h1 style={h1Style}>Terms of Service</h1>
      <p>
        By playing {COMPANY}, you agree to these terms. If you don't agree, please don't play.
      </p>

      <h2 style={h2Style}>The game</h2>
      <p>We provide a browser-based strategy game featuring trainable AI soldiers. We may update, modify, or pause the service at any time. We will make reasonable effort to preserve your progress across updates but do not guarantee indefinite availability.</p>

      <h2 style={h2Style}>Your account</h2>
      <p>If you create an account, you're responsible for your own sign-in. Anonymous guest sessions are tied to a single browser on a single device — clearing browser storage will lose that progress. We recommend creating an account if persistent progression matters to you.</p>

      <h2 style={h2Style}>Tokens and purchases</h2>
      <p>In-game tokens ("Tokens") are a virtual currency used to train soldiers and unlock weapons. They have no cash value, cannot be transferred between accounts, and cannot be redeemed for real money. Token purchases are processed by Stripe and delivered to your account automatically. See the <Link to="/refund" style={linkStyle}>Refund Policy</Link> for refund terms.</p>

      <h2 style={h2Style}>Conduct</h2>
      <p>Do not attempt to modify the client, exploit server bugs, or automate gameplay in ways that interfere with other players. We reserve the right to suspend accounts engaging in such behavior.</p>

      <h2 style={h2Style}>Intellectual property</h2>
      <p>The game, its art, code, neural-network designs, and game design are the property of {COMPANY}. Your own trained soldier weights remain yours — you may export them on request.</p>

      <h2 style={h2Style}>Warranty disclaimer</h2>
      <p>The game is provided "as is," without warranty of any kind. We don't guarantee the service will be uninterrupted, error-free, or secure.</p>

      <h2 style={h2Style}>Limitation of liability</h2>
      <p>To the extent permitted by law, {COMPANY}'s liability for any claim relating to the game is limited to the amount you paid us in the 12 months preceding the claim.</p>

      <h2 style={h2Style}>Disputes</h2>
      <p>Any disputes will be resolved by binding arbitration in the jurisdiction where {COMPANY} is headquartered, except where local consumer-protection laws grant you a different right.</p>

      <h2 style={h2Style}>Contact</h2>
      <p>Questions? <a href={`mailto:${CONTACT}`} style={linkStyle}>{CONTACT}</a>.</p>
    </>
  )
}

function RefundContent() {
  return (
    <>
      <h1 style={h1Style}>Refund Policy</h1>
      <p>We want you to feel good about every purchase. Here's how we handle refunds.</p>

      <h2 style={h2Style}>Unconsumed tokens</h2>
      <p>
        If you haven't spent the tokens from a purchase, we will refund the full amount within <strong>14 days</strong> of the transaction. Email <a href={`mailto:${CONTACT}`} style={linkStyle}>{CONTACT}</a> from the account's email address with your purchase receipt and we'll process the refund via Stripe.
      </p>

      <h2 style={h2Style}>Consumed tokens</h2>
      <p>
        Tokens spent on training, weapon manuals, or training-slot unlocks are not refundable — the in-game service was delivered. We recognize that training outcomes are stochastic (the AI learns differently every run); that variance is a feature of the game, not a product defect.
      </p>

      <h2 style={h2Style}>Accidental purchases</h2>
      <p>If you believe a purchase was made by someone other than you (e.g. a child), email us immediately. We'll work with you and with Stripe's dispute resolution process.</p>

      <h2 style={h2Style}>Chargebacks</h2>
      <p>If you file a chargeback without contacting us first, your account may be suspended while the dispute is resolved. We'd rather fix the issue directly — email us and we'll sort it.</p>

      <h2 style={h2Style}>Platform-specific rules</h2>
      <p>If you purchased through an app store (iOS / Android), refunds are subject to that platform's policy. We can't process refunds for purchases we didn't receive.</p>
    </>
  )
}

// ── Shared styles (inline so legal pages don't depend on camp-ui.css) ──
const pageStyle: React.CSSProperties = {
  minHeight: '100svh',
  background: '#0c1408',
  color: '#d0c4a8',
  fontFamily: "'Share Tech Mono', 'Consolas', monospace",
  lineHeight: 1.6,
  padding: '40px 20px',
}
const containerStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
}
const navStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 40,
  paddingBottom: 16,
  borderBottom: '1px solid rgba(212, 170, 64, 0.2)',
}
const linkStyle: React.CSSProperties = {
  color: '#d4aa40',
  textDecoration: 'none',
}
const navLinkStyle: React.CSSProperties = {
  ...linkStyle,
  marginLeft: 16,
  fontSize: 13,
}
const h1Style: React.CSSProperties = {
  fontFamily: "'Black Ops One', cursive",
  fontSize: 32,
  color: '#ffeaa0',
  letterSpacing: 1,
  marginBottom: 24,
}
const h2Style: React.CSSProperties = {
  fontFamily: "'Black Ops One', cursive",
  fontSize: 18,
  color: '#e8b830',
  letterSpacing: 0.5,
  marginTop: 28,
  marginBottom: 10,
}
const footerStyle: React.CSSProperties = {
  marginTop: 60,
  paddingTop: 16,
  borderTop: '1px solid rgba(212, 170, 64, 0.2)',
  fontSize: 12,
  color: 'rgba(255,255,255,0.4)',
  textAlign: 'center',
}
