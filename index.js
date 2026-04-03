import cron from 'node-cron';
import { validateConfig, SCHEDULER_INTERVAL_MINUTES } from './src/config.js';
import { initDatabase, closeDatabase } from './src/db/database.js';
import { processNewIssues } from './src/core/processor.js';
import logger from './src/utils/logger.js';

// ─── Banner ───
function printBanner() {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   🚀 GitHub → ClickUp Automation System          ║
  ║   Motor de automação de workflow                  ║
  ╚═══════════════════════════════════════════════════╝
  `);
}

// ─── Execução Principal ───
async function runCycle() {
  try {
    const result = await processNewIssues();
    return result;
  } catch (error) {
    logger.error('Erro no ciclo de processamento:', error.message);
    logger.debug('Stack:', error.stack);
    return { processed: 0, skipped: 0, errors: 1 };
  }
}

// ─── Startup ───
async function main() {
  printBanner();

  // Valida configuração
  try {
    validateConfig();
    logger.success('Configuração validada com sucesso.');
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }

  // Inicializa banco de dados
  initDatabase();

  // Executa o primeiro ciclo imediatamente
  logger.info('Executando primeiro ciclo...');
  await runCycle();

  // Configura o scheduler
  const cronExpression = `*/${SCHEDULER_INTERVAL_MINUTES} * * * *`;
  logger.info(`Scheduler configurado: a cada ${SCHEDULER_INTERVAL_MINUTES} minuto(s) (cron: ${cronExpression})`);

  cron.schedule(cronExpression, async () => {
    logger.info(`⏰ Scheduler disparado (intervalo: ${SCHEDULER_INTERVAL_MINUTES} min)`);
    await runCycle();
  });

  logger.info('Sistema rodando. Aguardando próximo ciclo...');
  logger.info('Pressione Ctrl+C para encerrar.');
}

// ─── Graceful Shutdown ───
process.on('SIGINT', () => {
  logger.info('\nEncerrando gracefully...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\nEncerrando gracefully...');
  closeDatabase();
  process.exit(0);
});

// Captura erros não tratados
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

main().catch((error) => {
  logger.error('Erro fatal:', error);
  closeDatabase();
  process.exit(1);
});
