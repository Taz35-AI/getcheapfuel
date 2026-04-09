import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <img
          src="/icons/logo.png"
          alt="GetCheapFuel"
          className="h-16 w-auto mx-auto mb-8"
        />
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-2">Page not found</p>
        <p className="text-sm text-gray-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Find Cheap Fuel
          </Link>
          <Link
            href="/cheap-fuel/london"
            className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Browse Cities
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3 text-xs text-gray-400">
          {['london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'liverpool'].map(city => (
            <Link
              key={city}
              href={`/cheap-fuel/${city}`}
              className="hover:text-green-600 hover:underline capitalize"
            >
              {city}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
