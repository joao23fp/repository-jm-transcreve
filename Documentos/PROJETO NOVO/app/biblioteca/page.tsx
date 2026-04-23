import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUserId } from '@/lib/auth-local'
import { listPrompts, listFolders } from './prompts.service'
import { PromptLibraryClient } from './components/PromptLibraryClient'

export default async function BibliotecaPage() {
  const userId = await getAuthUserId()
  if (!userId) redirect('/uploads')

  const [prompts, folders] = await Promise.all([
    listPrompts(userId),
    listFolders(userId),
  ])

  const serialized = prompts.map((p) => ({
    ...p,
    userId: p.userId ?? null,
    folderId: p.folderId ?? null,
    description: p.description ?? null,
    type: p.type as 'Sistema' | 'Usuario',
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  const serializedFolders = {
    raiz: folders.raiz.map((f) => ({ ...f, createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString() })),
    nivel1: folders.nivel1.map((f) => ({ ...f, createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString() })),
    nivel2: folders.nivel2.map((f) => ({ ...f, createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString() })),
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>Minha Biblioteca</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
            Gerencie seus prompts de IA personalizados
          </p>
        </div>
        <Link href="/uploads" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
          ← Enviar arquivos
        </Link>
      </div>

      <PromptLibraryClient initialPrompts={serialized} initialFolders={serializedFolders} />
    </main>
  )
}
