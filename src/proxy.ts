import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { hostname } = request.nextUrl;

  // Redirect www → non-www (permanent 308)
  if (hostname === "www.getcheapfuel.co.uk") {
    const url = request.nextUrl.clone();
    url.hostname = "getcheapfuel.co.uk";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static assets and metadata files
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|favicon-96x96.png|apple-touch-icon.png|site.webmanifest|sw.js|opengraph-image.png).*)",
  ],
};
