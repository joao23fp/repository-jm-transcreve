import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SYSTEM_TEMPLATES = [
  {
    id: 'sys_resumo_audiencia',
    name: 'Resumo de Audiência',
    description: 'Produz resumo estruturado da audiência com partes, pedidos e decisões.',
    body: 'Analise esta transcrição de audiência judicial e produza um resumo estruturado contendo: (1) Identificação das partes e advogados presentes, (2) Objeto da audiência, (3) Principais declarações de cada parte, (4) Decisões ou despachos proferidos, (5) Próximos passos determinados. Seja objetivo e use linguagem jurídica formal.',
  },
  {
    id: 'sys_analise_contradicoes',
    name: 'Análise de Contradições',
    description: 'Identifica contradições, inconsistências e mudanças de versão entre depoimentos.',
    body: 'Analise esta transcrição e identifique: (1) Contradições internas — quando o mesmo falante muda sua versão dos fatos, (2) Contradições externas — quando diferentes falantes divergem sobre o mesmo fato, (3) Inconsistências com o senso comum ou com fatos objetivos mencionados, (4) Evasões ou respostas vagas a perguntas diretas. Para cada contradição encontrada, cite os trechos exatos e o timestamp correspondente.',
  },
  {
    id: 'sys_fatos_chave',
    name: 'Extração de Fatos-Chave',
    description: 'Lista cronologicamente os fatos objetivos mencionados na transcrição.',
    body: 'Liste cronologicamente todos os fatos objetivos mencionados nesta transcrição. Para cada fato: (1) Descreva o evento de forma objetiva e imparcial, (2) Identifique quem relatou o fato, (3) Indique se o fato foi confirmado, negado ou contestado por outra parte, (4) Cite o timestamp onde o fato é mencionado. Foque apenas em fatos concretos, não em opiniões ou interpretações.',
  },
  {
    id: 'sys_perfil_falante',
    name: 'Perfil do Falante',
    description: 'Analisa comportamento comunicativo, credibilidade e padrões de resposta.',
    body: 'Analise o comportamento comunicativo dos falantes nesta transcrição e para cada um produza: (1) Padrões de linguagem e vocabulário utilizado, (2) Consistência e coerência das declarações ao longo do depoimento, (3) Reações a perguntas diretas versus indiretas, (4) Indicadores linguísticos de incerteza, evasão ou ênfase, (5) Avaliação geral de credibilidade com base no discurso. Baseie sua análise exclusivamente no conteúdo da transcrição.',
  },
  {
    id: 'sys_cronologia',
    name: 'Cronologia do Caso',
    description: 'Extrai e ordena cronologicamente todos os eventos mencionados.',
    body: 'Extraia e ordene cronologicamente todos os eventos mencionados nesta transcrição. Para cada evento: (1) Data e hora (se mencionados) ou posição temporal relativa, (2) Descrição objetiva do evento, (3) Quem relatou o evento, (4) Relevância jurídica potencial do evento. Organize a cronologia em formato de linha do tempo, do evento mais antigo ao mais recente. Inclua apenas eventos concretos, não suposições ou hipóteses.',
  },
]

async function main() {
  console.log('Seeding system prompt templates...')

  for (const template of SYSTEM_TEMPLATES) {
    await prisma.promptTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        description: template.description,
        body: template.body,
      },
      create: {
        id: template.id,
        userId: null,
        folderId: null,
        name: template.name,
        description: template.description,
        body: template.body,
        type: 'Sistema',
        isDeleted: false,
      },
    })
    console.log(`  ✓ ${template.name}`)
  }

  console.log(`\nDone — ${SYSTEM_TEMPLATES.length} system templates seeded.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
