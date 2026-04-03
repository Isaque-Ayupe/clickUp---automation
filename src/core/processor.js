import { fetchOpenIssues, formatIssue } from '../services/github.service.js';
import { createTask } from '../services/clickup.service.js';
import { classifyAndAssign } from './assigner.js';
import { isIssueProcessed, saveTask } from '../db/database.js';
import logger from '../utils/logger.js';

/**
 * Fluxo principal de processamento:
 * 1. Buscar issues abertas no GitHub
 * 2. Filtrar as que já foram processadas
 * 3. Para cada nova issue:
 *    a. Classificar via IA (area, assignee, prioridade)
 *    b. Criar task no ClickUp
 *    c. Salvar no banco de dados
 */
export async function processNewIssues() {
  logger.info('═══════════════════════════════════════════');
  logger.info('Iniciando ciclo de processamento...');
  logger.info('═══════════════════════════════════════════');

  // 1. Buscar issues
  const rawIssues = await fetchOpenIssues();

  if (rawIssues.length === 0) {
    logger.info('Nenhuma issue aberta encontrada. Ciclo encerrado.');
    return { processed: 0, skipped: 0, errors: 0 };
  }

  // 2. Filtrar não processadas
  const formattedIssues = rawIssues.map(formatIssue);
  const newIssues = formattedIssues.filter((issue) => !isIssueProcessed(issue.id));

  logger.info(
    `Issues: ${rawIssues.length} abertas, ${rawIssues.length - newIssues.length} já processadas, ${newIssues.length} novas.`
  );

  if (newIssues.length === 0) {
    logger.info('Nenhuma issue nova para processar. Ciclo encerrado.');
    return { processed: 0, skipped: rawIssues.length, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  // 3. Processar cada issue nova
  for (const issue of newIssues) {
    try {
      logger.info(`──── Processando issue #${issue.number}: "${issue.title}" ────`);

      // 3a. Classificar via IA
      const decision = await classifyAndAssign(issue);

      // 3b. Criar task no ClickUp
      const clickupTask = await createTask(issue, decision);

      // 3c. Salvar no banco
      saveTask({
        issueId: issue.id,
        issueNumber: issue.number,
        issueTitle: issue.title,
        clickupTaskId: clickupTask.id,
        assignedTo: decision.assignee,
        area: decision.area,
        priority: decision.priority,
      });

      processed++;
      logger.success(
        `Issue #${issue.number} → ClickUp task ${clickupTask.id} (${decision.assignee})`
      );

      // Pequeno delay entre requests para evitar rate limiting
      if (newIssues.indexOf(issue) < newIssues.length - 1) {
        await sleep(1500);
      }
    } catch (error) {
      errors++;
      logger.error(`Falha ao processar issue #${issue.number}:`, error.message);
      // Continua processando as demais issues
    }
  }

  // Resumo
  logger.info('═══════════════════════════════════════════');
  logger.info(`Ciclo concluído: ${processed} processadas, ${errors} erros.`);
  logger.info('═══════════════════════════════════════════');

  return {
    processed,
    skipped: rawIssues.length - newIssues.length,
    errors,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
