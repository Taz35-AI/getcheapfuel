import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'GetCheapFuel privacy policy. Learn how we collect, use, and protect your data when using our UK fuel and EV charging price comparison service.',
  alternates: {
    canonical: 'https://getcheapfuel.co.uk/privacy',
  },
}

export default function PrivacyPage() {
  return (
    <main className="h-screen overflow-y-auto">
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mb-8"
      >
        &larr; Back to GetCheapFuel
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">
        Last updated: 9 April 2026
      </p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Who We Are</h2>
          <p>
            GetCheapFuel (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website{' '}
            <strong>getcheapfuel.co.uk</strong>, a free fuel and EV charging price comparison
            service for the United Kingdom. For any privacy-related queries, contact us at{' '}
            <a href="mailto:support@getcheapfuel.co.uk" className="text-green-600 hover:underline">
              support@getcheapfuel.co.uk
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Data We Collect</h2>
          <p>We collect the minimum data necessary to provide our service:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Location data</strong> &mdash; your approximate location (only when you
              grant permission) to find nearby fuel stations and EV chargers.
            </li>
            <li>
              <strong>Search queries</strong> &mdash; postcodes or place names you search for.
            </li>
            <li>
              <strong>Local storage data</strong> &mdash; your favourites, preferences, and
              cookie consent choice are stored in your browser only.
            </li>
            <li>
              <strong>Push notification tokens</strong> &mdash; if you opt in to price alerts,
              we store your subscription endpoint to deliver notifications.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To display nearby fuel stations and EV chargers with current prices.</li>
            <li>To send price alert notifications you have opted in to.</li>
            <li>To improve the accuracy and performance of our service.</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> sell, rent, or share your personal data with third parties
            for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Supabase</strong> &mdash; database and authentication infrastructure.
            </li>
            <li>
              <strong>Vercel</strong> &mdash; website hosting and analytics.
            </li>
            <li>
              <strong>Open Charge Map</strong> &mdash; EV charger location data.
            </li>
            <li>
              <strong>UK fuel retailers</strong> &mdash; fuel price data sourced directly
              from retailers.
            </li>
          </ul>
          <p className="mt-2">
            Each service has its own privacy policy and processes data in accordance with GDPR.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Cookies</h2>
          <p>
            We use only essential cookies required for the website to function. We do not use
            advertising or tracking cookies. Your cookie consent preference is stored locally
            in your browser.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Your Rights (GDPR)</h2>
          <p>Under UK GDPR, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data.</li>
            <li>Withdraw consent for push notifications at any time.</li>
            <li>Lodge a complaint with the ICO (Information Commissioner&apos;s Office).</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, email{' '}
            <a href="mailto:support@getcheapfuel.co.uk" className="text-green-600 hover:underline">
              support@getcheapfuel.co.uk
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Data Retention</h2>
          <p>
            Push notification subscriptions are retained until you unsubscribe. Browser-stored
            data (favourites, preferences) remains until you clear your browser data. We do not
            retain location data beyond the duration of your session.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Children&apos;s Privacy</h2>
          <p>
            Our service is not directed at children under 13. We do not knowingly collect data
            from children.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Changes will be posted on this page
            with an updated date. Continued use of the service constitutes acceptance of the
            revised policy.
          </p>
        </section>
      </div>
    </div>
    </main>
  )
}
