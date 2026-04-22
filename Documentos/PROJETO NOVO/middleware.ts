import { NextRequest, NextResponse } from 'next/server'

const DEV_NO_AUTH =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('[YOUR-KEY]')

export async function middleware(req: NextRequest) {
  // In local dev without Clerk keys, pass through
  if (DEV_NO_AUTH) return NextResponse.next()

  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server')
  const isProtected = createRouteMatcher(['/api/billing/(.*)', '/dashboard(.*)'])

  return clerkMiddleware(async (auth) => {
    if (isProtected(req)) await auth.protect()
    return NextResponse.next()
  })(req, {} as any)
}

export const config = {
  matcher: ['/api/billing/(.*)', '/dashboard(.*)'],
}
