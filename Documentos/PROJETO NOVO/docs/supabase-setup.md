# Configuração Supabase

## CORS no Storage Bucket

Para que o upload direto via presigned URL funcione no browser, configure o CORS no bucket:

1. Acesse o Supabase Dashboard → Storage → Buckets → `transcribeadv-uploads`
2. Clique em "Edit bucket" → "CORS configuration"
3. Adicione:

```json
[
  {
    "allowedOrigins": ["http://localhost:3000", "https://transcribeadv.com.br"],
    "allowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "allowedHeaders": ["*"],
    "maxAgeSeconds": 3600
  }
]
```

## Criar bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('transcribeadv-uploads', 'transcribeadv-uploads', false);
```

## Storage RLS

```sql
CREATE POLICY "Service role full access"
  ON storage.objects FOR ALL
  TO service_role USING (true);

CREATE POLICY "Usuárias autenticadas fazem upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'transcribeadv-uploads');
```

## Webhook Clerk

1. Clerk Dashboard → Webhooks → Add endpoint
2. URL: `https://[SEU-DOMINIO]/api/webhooks/clerk`
3. Eventos: `user.created`
4. Copiar Signing Secret → `CLERK_WEBHOOK_SECRET` no .env
