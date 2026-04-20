import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const DEV_NO_AUTH =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('[YOUR-KEY]')

export async function proxy(req: NextRequest) {
  if (DEV_NO_AUTH) {
    return NextResponse.next()
  }

  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server')
  const isProtectedRoute = createRouteMatcher([
    '/uploads(.*)',
    '/transcricoes(.*)',
    '/clips(.*)',
    '/biblioteca(.*)',
    '/dashboard(.*)',
    '/api/uploads(.*)',
    '/api/webhooks/clerk(.*)',
  ])

  return clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) {
      await auth.protect()
    }
  })(req, {} as any)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
