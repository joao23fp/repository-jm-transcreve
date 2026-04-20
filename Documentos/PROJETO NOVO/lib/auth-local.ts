const DEV_NO_AUTH =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('[YOUR-KEY]')

export const DEV_USER_ID = 'dev-user-local'

export async function getAuthUserId(): Promise<string | null> {
  if (DEV_NO_AUTH) return DEV_USER_ID

  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()
  return userId
}
