import {
  ChatIllustration,
  ExpenseIllustration,
  HeroIllustration,
  InsightsIllustration,
  SnapIllustration,
} from '../components/illustrations'

export default function Landing() {
  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">Made for Nepal · NPR &amp; BS dates</span>
          <h1 className="hero-title">
            Take back control of <em>your financial life</em>
          </h1>
          <p className="hero-sub">
            Snap your bills, track every expense, and ask an AI assistant that actually knows your
            money — built for how finance works in Nepal.
          </p>
          <div className="hero-cta">
            <a href="/login" className="btn btn-accent btn-lg">
              Log in
            </a>
            <a href="/register" className="btn btn-ghost btn-lg">
              Create account
            </a>
          </div>
        </div>
        <div className="hero-media hero-media-vector">
          <HeroIllustration />
        </div>
      </section>

      {/* Feature grid with vector illustrations */}
      <section className="features" id="features">
        <h2 className="section-title">Everything in one place</h2>
        <div className="feature-grid">
          <article className="feature-card">
            <div className="feature-img feature-img-vector">
              <ExpenseIllustration />
            </div>
            <div className="feature-body">
              <h3>Expense Tracking</h3>
              <p>
                Every confirmed expense in one ledger — from snapped bills to manual entries, in NPR
                with BS dates.
              </p>
            </div>
          </article>
          <article className="feature-card">
            <div className="feature-img feature-img-vector">
              <SnapIllustration />
            </div>
            <div className="feature-body">
              <h3>Snap a Bill</h3>
              <p>
                Photograph or upload a PDF bill. We extract the line items and turn them into an
                expense automatically.
              </p>
            </div>
          </article>
          <article className="feature-card">
            <div className="feature-img feature-img-vector">
              <InsightsIllustration />
            </div>
            <div className="feature-body">
              <h3>Spending Insights</h3>
              <p>
                Understand where your money goes each month and spot trends before they become
                problems.
              </p>
            </div>
          </article>
          <article className="feature-card">
            <div className="feature-img feature-img-vector">
              <ChatIllustration />
            </div>
            <div className="feature-body">
              <h3>Ask Fin Buddy</h3>
              <p>
                A finance assistant grounded in your own bills and documents — ask anything, get
                cited answers.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* How it works */}
      <section className="steps" id="how-it-works">
        <h2 className="section-title">How it works</h2>
        <ol className="steps-grid">
          <li>
            <span className="step-num">1</span>
            <h3>Snap or upload</h3>
            <p>Take a photo of a bill or drop in a PDF — invoices, receipts, bank statements.</p>
          </li>
          <li>
            <span className="step-num">2</span>
            <h3>We extract it</h3>
            <p>
              Line items, totals, VAT, vendors and dates are pulled out and structured for you to
              confirm.
            </p>
          </li>
          <li>
            <span className="step-num">3</span>
            <h3>Stay on top</h3>
            <p>Track expenses, chat with your documents, and see your spending clearly.</p>
          </li>
        </ol>
      </section>

      {/* Sign-up band */}
      <section className="cta-band">
        <div>
          <h2>Ready to take control?</h2>
          <p>Create a free account and snap your first bill — it takes less than a minute.</p>
        </div>
        <a href="/register" className="btn btn-accent btn-lg">
          Get started
        </a>
      </section>
    </div>
  )
}