import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@transcribeadv.com.br'
const DEV_NO_AUTH =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('[YOUR-KEY]')

async function getUserEmail(userId: string): Promise<string | null> {
  if (DEV_NO_AUTH) return 'dev@transcribeadv.local'
  try {
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    return user.emailAddresses?.[0]?.emailAddress ?? null
  } catch {
    return null
  }
}

export async function sendSuccessEmail(userEmail: string, fileName: string) {
  await resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: `Transcrição pronta — ${fileName}`,
    html: `<p>Sua transcrição de <strong>${fileName}</strong> está pronta. Acesse o TranscreveAdv para visualizar.</p>`,
  })
}

export async function sendFailureEmail(userEmail: string, fileName: string, refundedMinutes: number) {
  await resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: `Erro ao processar ${fileName}`,
    html: `<p>Ocorreu um erro ao processar <strong>${fileName}</strong>. ${refundedMinutes} minutos foram estornados para o seu saldo.</p>`,
  })
}

export async function sendExpiredUploadEmail(userEmail: string, fileName: string) {
  await resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: `Upload não concluído — ${fileName}`,
    html: `<p>Seu upload de <strong>${fileName}</strong> não foi concluído — o tempo expirou. Seus créditos foram estornados. <a href="${process.env.NEXT_PUBLIC_APP_URL}/uploads">Tente novamente</a>.</p>`,
  })
}

export async function sendLowBalanceEmail(userId: string, threshold: number) {
  const email = await getUserEmail(userId)
  if (!email) return
  const subject = threshold <= 5
    ? `AVISO CRÍTICO: Seu saldo está em ${threshold}%`
    : `Aviso: Seu saldo está em ${threshold}%`
  await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html: `<p>Seu saldo de minutos está em <strong>${threshold}%</strong>. <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Comprar créditos</a>.</p>`,
  })
}

export async function sendSuccessPaymentEmail(userId: string, planLabel: string, minutesGranted: number) {
  const email = await getUserEmail(userId)
  if (!email) return
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Pagamento confirmado — ${planLabel}`,
    html: `<p>Seu pagamento foi confirmado. <strong>${minutesGranted} minutos</strong> foram adicionados ao seu saldo. <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Ver saldo</a>.</p>`,
  })
}
