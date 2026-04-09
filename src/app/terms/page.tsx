import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'GetCheapFuel terms of service. Read the terms and conditions for using our UK fuel and EV charging price comparison service.',
  alternates: {
    canonical: 'https://getcheapfuel.co.uk/terms',
  },
}

export default function TermsPage() {
  return (
    <main className="h-screen overflow-y-auto">
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mb-8"
      >
        &larr; Back to GetCheapFuel
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">
        Last updated: 9 April 2026
      </p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using GetCheapFuel (&quot;the Service&quot;) at{' '}
            <strong>getcheapfuel.co.uk</strong>, you agree to be bound by these Terms of
            Service. If you do not agree, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Description of Service</h2>
          <p>
            GetCheapFuel is a free fuel and EV charging price comparison tool for the United
            Kingdom. We aggregate publicly available price data from the Competition and
            UK fuel retailers and EV charger data from Open Charge Map to help users
            find the cheapest fuel and charging options near them.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Accuracy of Information</h2>
          <p>
            While we strive to provide accurate and up-to-date pricing information, we cannot
            guarantee the accuracy, completeness, or timeliness of the data displayed. Fuel and
            charging prices may change without notice. Always verify prices at the point of
            sale.
          </p>
          <p className="mt-2">
            GetCheapFuel is provided on an &quot;as is&quot; and &quot;as available&quot; basis
            without warranties of any kind, either express or implied.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the Service for any unlawful purpose.</li>
            <li>
              Attempt to scrape, crawl, or systematically extract data from the Service beyond
              normal use.
            </li>
            <li>Interfere with or disrupt the Service or its infrastructure.</li>
            <li>Misrepresent your identity or affiliation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Intellectual Property</h2>
          <p>
            All content, design, and code on GetCheapFuel is owned by us or our licensors. You
            may not reproduce, distribute, or create derivative works without our written
            permission. Fuel price data is sourced directly from UK retailers under open data terms. EV
            charger data is provided by Open Charge Map under the Open Data Commons Open
            Database License.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, GetCheapFuel shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages arising from your
            use of the Service. This includes, but is not limited to, losses arising from
            inaccurate pricing data or service unavailability.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Third-Party Links</h2>
          <p>
            The Service may contain links to third-party websites or services. We are not
            responsible for the content or practices of these external sites.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Modifications</h2>
          <p>
            We reserve the right to modify or discontinue the Service at any time without
            notice. We may also update these Terms from time to time. Continued use after
            changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of England
            and Wales. Any disputes shall be subject to the exclusive jurisdiction of the
            courts of England and Wales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us at{' '}
            <a href="mailto:support@getcheapfuel.co.uk" className="text-green-600 hover:underline">
              support@getcheapfuel.co.uk
            </a>.
          </p>
        </section>
      </div>
    </div>
    </main>
  )
}
