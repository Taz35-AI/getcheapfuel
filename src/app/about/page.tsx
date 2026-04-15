import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | GetCheapFuel',
  description:
    'GetCheapFuel is a free, ad-free UK fuel price comparison tool built and funded by one person. No sponsors, no ads, just honest fuel prices from 8,200+ stations.',
  alternates: {
    canonical: 'https://getcheapfuel.co.uk/about',
  },
  openGraph: {
    title: 'About | GetCheapFuel',
    description:
      'A free, ad-free fuel price tool for UK drivers. Built and funded independently.',
    url: 'https://getcheapfuel.co.uk/about',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mb-8"
        >
          &larr; Back to GetCheapFuel
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Hey, I&apos;m Alex.
        </h1>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>
            I built GetCheapFuel because every other fuel price site is the same.
            Plastered with ads, slow to load, and half the prices are a week old.
          </p>

          <p>
            I&apos;m just a regular guy who got fed up. I wanted to check the cheapest
            fuel near me without closing three cookie banners and dodging pop-ups
            for car insurance I didn&apos;t ask for.
          </p>

          <p>So I built my own.</p>

          <h2 className="text-xl font-bold text-gray-900 pt-4">
            No ads. No sponsors. No catch.
          </h2>

          <p>
            This whole thing runs out of my own pocket. There&apos;s no company behind
            it, no investors, no ad deals with fuel brands. Just me, paying for the
            servers, writing the code, and keeping the data fresh across 8,200+
            stations.
          </p>

          <p>
            I don&apos;t make money from this. I just think drivers deserve a clean,
            fast tool that actually works.
          </p>

          <h2 className="text-xl font-bold text-gray-900 pt-4">
            What you get
          </h2>

          <p>
            Real prices. Updated daily. No sign-up required to see them. The map
            loads fast, the data is honest, and I&apos;m not trying to sell you
            anything.
          </p>

          <p>
            If you want extras like tracking your fuel spending or setting price
            alerts, you can create a free account. That&apos;s it.
          </p>

          <h2 className="text-xl font-bold text-gray-900 pt-4">
            Got feedback?
          </h2>

          <p>
            I read everything. If something&apos;s broken or you&apos;ve got an idea, drop
            me a line at{' '}
            <a
              href="mailto:support@getcheapfuel.co.uk"
              className="text-green-600 hover:text-green-700 underline"
            >
              support@getcheapfuel.co.uk
            </a>
            . It&apos;s literally just me on the other end.
          </p>

          <p className="font-semibold text-gray-900 pt-4">Alex</p>
        </div>

        <footer className="border-t border-gray-200 mt-12 pt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>&copy; {new Date().getFullYear()} GetCheapFuel</span>
          <Link href="/privacy" className="hover:text-gray-700 hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-700 hover:underline">Terms of Service</Link>
          <a href="mailto:support@getcheapfuel.co.uk" className="hover:text-gray-700 hover:underline">Contact</a>
        </footer>
      </div>
    </main>
  );
}
