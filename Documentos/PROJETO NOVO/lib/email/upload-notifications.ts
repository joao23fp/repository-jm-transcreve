import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@transcribeadv.com.br'

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
