import { redirect } from 'next/navigation'
import { getAuthUserId } from '@/lib/auth-local'
import { listPrompts, listFolders } from './prompts.service'
import { PromptLibraryClient } from './components/PromptLibraryClient'
import { AppLayout } from '@/components/layout/AppLayout'

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
    <AppLayout>
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Minha Biblioteca</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Prompts de IA para análise jurídica personalizada
          </p>
        </div>
        <PromptLibraryClient initialPrompts={serialized} initialFolders={serializedFolders} />
      </div>
    </AppLayout>
  )
}
