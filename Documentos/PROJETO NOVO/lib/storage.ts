import path from 'path'
import fs from 'fs/promises'

export const IS_LOCAL_STORAGE =
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY.includes('[YOUR-')

const BASE = path.resolve(process.env.LOCAL_STORAGE_PATH ?? './local-storage')

export async function localStorageSave(storagePath: string, data: Buffer) {
  const full = path.join(BASE, storagePath)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, data)
}

export async function localStorageRead(storagePath: string): Promise<Buffer> {
  const full = path.join(BASE, storagePath)
  return fs.readFile(full)
}

export function localStorageUrl(storagePath: string): string {
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/uploads/local-file/${encodedPath}`
}
