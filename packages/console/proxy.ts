import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isWorkOS = !!process.env.WORKOS_CLIENT_ID;

const workosMiddleware = isWorkOS
  ? authkitMiddleware({
      middlewareAuth: {
        enabled: true,
        unauthenticatedPaths: ["/"],
      },
    })
  : null;

export default function proxy(request: NextRequest) {
  if (workosMiddleware) {
    return workosMiddleware(request, {} as never);
  }

  // Local dev mode: pass through
  return NextResponse.next();
}

// Only run the proxy on app routes, not static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
