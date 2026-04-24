import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUserId } from '@/lib/auth-local'
import { listPrompts, listFolders } from './prompts.service'
import { PromptLibraryClient } from './components/PromptLibraryClient'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, BookOpen, Mic } from 'lucide-react'

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
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight">TranscreveAdv</span>
            <span className="text-border mx-1">/</span>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              Biblioteca
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/uploads"><ArrowLeft className="w-4 h-4 mr-1.5" />Uploads</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight">Minha Biblioteca</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Prompts de IA para análise jurídica personalizada
          </p>
        </div>
        <Separator className="mb-6" />
        <PromptLibraryClient initialPrompts={serialized} initialFolders={serializedFolders} />
      </main>
    </div>
  )
}
