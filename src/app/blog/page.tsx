import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Fuel Price News & Guides | GetCheapFuel Blog',
  description:
    'The latest UK fuel price news, analysis and money-saving guides. Expert insights on petrol and diesel costs, oil market updates and tips to save at the pump.',
  alternates: { canonical: 'https://getcheapfuel.co.uk/blog' },
  openGraph: {
    title: 'Fuel Price News & Guides | GetCheapFuel Blog',
    description:
      'The latest UK fuel price news, analysis and money-saving guides from GetCheapFuel.',
    url: 'https://getcheapfuel.co.uk/blog',
    type: 'website',
  },
};

const POSTS = [
  {
    slug: 'diesel-outrunning-petrol-april-2026',
    title: 'Diesel is outrunning petrol again. Here is why, and what to do this week.',
    excerpt:
      'Unleaded is at 158.0p, diesel at 192.1p and climbing faster. The Strait of Hormuz, European supply, and the 4.2p supermarket gap explained, plus three things that actually save you money at the pump this week.',
    date: '2026-04-18',
    readTime: '5 min read',
    category: 'Market Analysis',
  },
  {
    slug: 'trump-strait-of-hormuz-blockade-uk-fuel-prices',
    title: "Trump's Strait of Hormuz Blockade: What It Means for UK Petrol and Diesel Prices",
    excerpt:
      'President Trump has announced a naval blockade on the Strait of Hormuz. With 20% of global crude oil flowing through this waterway, UK drivers could see petrol and diesel prices rise sharply. Here\'s what you need to know and how to protect your wallet.',
    date: '2026-04-13',
    readTime: '6 min read',
    category: 'Market Analysis',
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mb-8"
        >
          &larr; Back to GetCheapFuel
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Fuel Price News &amp; Guides
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Expert analysis on UK petrol and diesel prices, oil market updates, and practical tips to save money at the pump.
        </p>

        <div className="space-y-8">
          {POSTS.map(post => {
            const date = new Date(post.date);
            const formatted = new Intl.DateTimeFormat('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(date);

            return (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-green-700 font-semibold bg-green-50 px-2.5 py-1 rounded-full">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-400">{formatted}</span>
                    <span className="text-xs text-gray-400">{post.readTime}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                  <span className="inline-block mt-3 text-sm font-semibold text-green-600 group-hover:underline">
                    Read more &rarr;
                  </span>
                </Link>
              </article>
            );
          })}
        </div>

        <footer className="border-t border-gray-200 mt-12 pt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>&copy; {new Date().getFullYear()} GetCheapFuel</span>
          <Link href="/privacy" className="hover:text-gray-700 hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-700 hover:underline">Terms of Service</Link>
          <a href="mailto:contact@getcheapfuel.co.uk" className="hover:text-gray-700 hover:underline">Contact</a>
        </footer>
      </div>
    </main>
  );
}
