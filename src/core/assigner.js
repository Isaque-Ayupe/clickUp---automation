import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_MODEL, TEAM } from '../config.js';
import { getWorkloadCounts } from '../db/database.js';
import logger from '../utils/logger.js';

let client;

function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return client;
}

/**
 * Monta o prompt do sistema para o agente de decisão.
 */
function buildSystemPrompt(workload) {
  const teamInfo = Object.entries(TEAM)
    .map(([area, members]) => {
      const membersWithLoad = members.map((m) => `${m} (${workload[m] || 0} tasks)`);
      return `  ${area}: ${membersWithLoad.join(', ')}`;
    })
    .join('\n');

  return `Você é um agente de automação responsável por gerenciar tarefas de um projeto de software (sistema de biblioteca).

Seu papel é PROCESSAR issues do GitHub e transformá-las em decisões de atribuição bem estruturadas.

## CONTEXTO DO TIME (com workload atual)
${teamInfo}

## REGRAS DE DECISÃO
1. Identifique a área da issue (backend, frontend, qa, docs)
2. Escolha o responsável com MENOR workload dentro da área identificada
3. Se a issue envolve mais de uma área, priorize a área principal
4. Defina a prioridade com base na urgência e impacto
5. Se um membro aparece em múltiplas áreas, considere sua carga total

## FORMATO DE SAÍDA
Responda EXCLUSIVAMENTE com um JSON válido, sem markdown, sem explicação extra:
{
  "area": "backend|frontend|qa|docs",
  "assignee": "nome_do_membro",
  "priority": "high|medium|low",
  "tags": ["tag1", "tag2"],
  "justification": "Explicação breve da decisão",
  "technical_notes": "Observações técnicas opcionais"
}`;
}

/**
 * Envia uma issue para o agente de IA e recebe a decisão de atribuição.
 *
 * @param {object} issue - Issue formatada (id, number, title, body, labels, url)
 * @returns {object} Decisão: { area, assignee, priority, tags, justification, technical_notes }
 */
export async function classifyAndAssign(issue) {
  const gemini = getClient();
  const workload = getWorkloadCounts();

  const systemPrompt = buildSystemPrompt(workload);

  const userMessage = [
    `## Issue #${issue.number}: ${issue.title}`,
    ``,
    `**Labels:** ${issue.labels.length > 0 ? issue.labels.join(', ') : 'nenhuma'}`,
    `**Autor:** ${issue.user}`,
    ``,
    `### Descrição:`,
    issue.body || '_Sem descrição._',
  ].join('\n');

  logger.debug(`Enviando issue #${issue.number} para classificação IA...`);

  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      }
    });

    const content = response.text || '';

    // Extrai o JSON da resposta
    const decision = JSON.parse(content);

    // Validações básicas
    if (!decision.area || !decision.assignee || !decision.priority) {
      throw new Error(`Decisão da IA incompleta: ${JSON.stringify(decision)}`);
    }

    // Verifica se o assignee pertence ao time
    const allMembers = [...new Set(Object.values(TEAM).flat())];
    if (!allMembers.includes(decision.assignee)) {
      logger.warn(
        `IA sugeriu membro desconhecido "${decision.assignee}". Usando fallback.`
      );
      // Fallback: membro com menor carga na área
      const areaMembers = TEAM[decision.area] || TEAM.backend;
      decision.assignee = areaMembers.reduce((min, m) =>
        (workload[m] || 0) < (workload[min] || 0) ? m : min
      );
    }

    logger.info(
      `IA decidiu: issue #${issue.number} → ${decision.assignee} (${decision.area}, ${decision.priority})`
    );
    logger.debug('Justificativa:', decision.justification);

    return decision;
  } catch (error) {
    logger.error(`Erro na classificação IA da issue #${issue.number}:`, error.message);

    // Fallback determinístico: backend, menor workload geral
    const fallbackArea = 'backend';
    const fallbackMembers = TEAM[fallbackArea];
    const fallbackAssignee = fallbackMembers.reduce((min, m) =>
      (workload[m] || 0) < (workload[min] || 0) ? m : min
    );

    logger.warn(`Usando fallback determinístico: ${fallbackAssignee} (${fallbackArea})`);

    return {
      area: fallbackArea,
      assignee: fallbackAssignee,
      priority: 'medium',
      tags: [fallbackArea],
      justification: `Fallback automático: erro na classificação IA. Atribuído ao membro com menor carga em ${fallbackArea}.`,
      technical_notes: `Erro original: ${error.message}`,
    };
  }
}
