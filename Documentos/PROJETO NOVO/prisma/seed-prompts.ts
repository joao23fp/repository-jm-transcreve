import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SYSTEM_TEMPLATES = [
  // ── Geral (qualquer conteúdo) ──────────────────────────────────
  {
    id: 'sys_resumo_geral',
    name: 'Resumo Geral',
    description: 'Resumo claro e direto de qualquer áudio ou vídeo.',
    body: 'Leia esta transcrição e produza um resumo claro e direto contendo: (1) Tema principal abordado, (2) Pontos mais importantes discutidos (máx. 5 tópicos), (3) Conclusões ou resultados mencionados, (4) Qualquer próximo passo ou ação indicada. Escreva em linguagem simples e objetiva, sem jargões.',
  },
  {
    id: 'sys_resumo_reuniao',
    name: 'Resumo de Reunião',
    description: 'Ata de reunião com participantes, decisões e próximas ações.',
    body: 'Analise esta transcrição de reunião e produza uma ata estruturada com: (1) Lista de participantes identificados, (2) Pauta ou temas discutidos, (3) Decisões tomadas durante a reunião, (4) Próximas ações definidas — para cada ação indique o responsável e o prazo mencionado (se houver), (5) Pontos em aberto ou pendências. Seja objetivo e use formato de lista.',
  },
  {
    id: 'sys_pontos_acao',
    name: 'Pontos de Ação',
    description: 'Extrai apenas as tarefas, responsáveis e prazos mencionados.',
    body: 'Leia esta transcrição e liste APENAS os pontos de ação mencionados. Para cada item: (1) Descreva a tarefa de forma clara, (2) Identifique o responsável (se mencionado), (3) Indique o prazo (se mencionado), (4) Cite o timestamp onde foi definido. Ignore qualquer conteúdo que não seja uma ação concreta. Formato: lista numerada.',
  },
  {
    id: 'sys_resumo_entrevista',
    name: 'Resumo de Entrevista',
    description: 'Análise de entrevista com pontos fortes, fracos e perfil do candidato.',
    body: 'Analise esta transcrição de entrevista e produza: (1) Perfil geral do entrevistado com base nas respostas, (2) Pontos fortes demonstrados (habilidades, experiências, exemplos concretos citados), (3) Pontos de atenção ou lacunas identificadas, (4) Nível de comunicação e clareza nas respostas, (5) Recomendação geral (adequado / requer avaliação adicional / não recomendado). Baseie-se exclusivamente no que foi dito.',
  },
  {
    id: 'sys_topicos_principais',
    name: 'Tópicos Principais',
    description: 'Lista os temas centrais discutidos, ideal para podcasts e aulas.',
    body: 'Identifique e liste os tópicos principais abordados nesta transcrição. Para cada tópico: (1) Nome do tópico, (2) Breve descrição (2-3 linhas), (3) Timestamp aproximado onde foi discutido, (4) Quem abordou o tema (se identificável). Ordene os tópicos pela ordem em que apareceram. Ideal para criar um índice de conteúdo.',
  },
  // ── Jurídico ───────────────────────────────────────────────────
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
