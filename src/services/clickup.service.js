import axios from 'axios';
import { CLICKUP_API_TOKEN, CLICKUP_LIST_ID } from '../config.js';
import logger from '../utils/logger.js';

const BASE_URL = 'https://api.clickup.com/api/v2';

/**
 * Cria uma instância de axios configurada para a API do ClickUp.
 */
function getClient() {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: CLICKUP_API_TOKEN,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Mapeia a prioridade textual para o formato numérico do ClickUp.
 * ClickUp: 1 = Urgent, 2 = High, 3 = Normal, 4 = Low
 */
function mapPriority(priority) {
  const map = {
    urgent: 1,
    high: 2,
    medium: 3,
    normal: 3,
    low: 4,
  };
  return map[priority?.toLowerCase()] || 3;
}

/**
 * Monta a descrição da task no ClickUp a partir dos dados da issue.
 */
function buildDescription(issue, decision) {
  return [
    `## Descrição`,
    ``,
    issue.body || '_Sem descrição na issue._',
    ``,
    `---`,
    ``,
    `## Origem`,
    `- **GitHub Issue:** [#${issue.number} - ${issue.title}](${issue.url})`,
    `- **Autor:** ${issue.user}`,
    `- **Criada em:** ${issue.createdAt}`,
    ``,
    `## Classificação (IA)`,
    `- **Área:** ${decision.area}`,
    `- **Prioridade:** ${decision.priority}`,
    `- **Justificativa:** ${decision.justification}`,
    ``,
    `## Critérios de Aceitação`,
    `- [ ] Implementação concluída`,
    `- [ ] Testes escritos`,
    `- [ ] Code review aprovado`,
    ``,
    `## Observações Técnicas`,
    `${decision.technical_notes || '_Nenhuma observação adicional._'}`,
  ].join('\n');
}

/**
 * Cria uma task no ClickUp com os dados da issue e a decisão do agente.
 *
 * @param {object} issue - Issue formatada do GitHub
 * @param {object} decision - Decisão do agente IA: { area, assignee, priority, tags, justification }
 * @returns {object} Task criada no ClickUp
 */
export async function createTask(issue, decision) {
  const client = getClient();

  const payload = {
    name: `[#${issue.number}] ${issue.title}`,
    description: buildDescription(issue, decision),
    tags: decision.tags || [decision.area],
    priority: mapPriority(decision.priority),
    status: 'Backlog',
    notify_all: false,
  };

  logger.debug('Criando task no ClickUp:', { name: payload.name, area: decision.area });

  try {
    const response = await client.post(`/list/${CLICKUP_LIST_ID}/task`, payload);
    const task = response.data;

    logger.success(
      `Task criada no ClickUp: "${task.name}" (ID: ${task.id}) → ${decision.assignee}`
    );

    return task;
  } catch (error) {
    const msg = error.response?.data?.err || error.message;
    logger.error('Erro ao criar task no ClickUp:', msg);
    throw new Error(`ClickUp API error: ${msg}`);
  }
}

/**
 * Retorna as tasks de uma list (para cálculo de workload externo, se necessário).
 */
export async function getTasksFromList() {
  const client = getClient();

  try {
    const response = await client.get(`/list/${CLICKUP_LIST_ID}/task`, {
      params: {
        archived: false,
        subtasks: true,
      },
    });
    return response.data.tasks || [];
  } catch (error) {
    logger.error('Erro ao buscar tasks do ClickUp:', error.message);
    return [];
  }
}
