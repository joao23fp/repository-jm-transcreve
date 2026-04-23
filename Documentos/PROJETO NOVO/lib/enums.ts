// 1 crédito = 1 minuto de áudio/vídeo processado

export enum StatusProcessamento {
  PENDING     = 'PENDING',
  PROCESSING  = 'PROCESSING',
  COMPLETED   = 'COMPLETED',
  FAILED      = 'FAILED',
}

export enum EtapaProcessamento {
  UPLOADING    = 'UPLOADING',
  QUEUED       = 'QUEUED',
  TRANSCRIBING = 'TRANSCRIBING',
  ANALYZING    = 'ANALYZING',
  COMPLETED    = 'COMPLETED',
  FAILED       = 'FAILED',
}

export enum StatusReserva {
  ACTIVE   = 'ACTIVE',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
}

export enum TipoTransacao {
  COMPRA   = 'COMPRA',
  BLOQUEIO = 'BLOQUEIO',
  ESTORNO  = 'ESTORNO',
  CONSUMO  = 'CONSUMO',
}

export enum StatusPagamento {
  PENDING   = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED    = 'FAILED',
  EXPIRED   = 'EXPIRED',
}

export enum FormatoAceito {
  MP4 = 'video/mp4',
  MKV = 'video/x-matroska',
  MOV = 'video/quicktime',
  AVI = 'video/x-msvideo',
  MP3 = 'audio/mpeg',
  WAV = 'audio/wav',
  M4A = 'audio/mp4',
  OGG = 'audio/ogg',
}

export const MIME_TYPES_ACEITOS = Object.values(FormatoAceito) as string[]

export const EXTENSOES_ACEITAS = ['.mp4', '.mkv', '.mov', '.avi', '.mp3', '.wav', '.m4a', '.ogg']

export enum StatusClipe {
  PENDING    = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED  = 'COMPLETED',
  FAILED     = 'FAILED',
}

export enum FormatoExport {
  VIDEO = 'VIDEO',
  PDF   = 'PDF',
  WORD  = 'WORD',
}

export enum TipoPrompt {
  Sistema  = 'Sistema',
  Usuario  = 'Usuario',
}

export const LIMITE_TAMANHO_BYTES = 2_147_483_648 // 2 GB
export const LIMITE_DURACAO_SEGUNDOS = 14_400      // 4 horas
export const MAX_ARQUIVOS_SIMULTANEOS = 5
export const TTL_PRESIGNED_URL_MINUTOS = 15
