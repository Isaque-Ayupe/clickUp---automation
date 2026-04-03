import { Octokit } from 'octokit';
import { GITHUB_TOKEN, GITHUB_REPO } from '../config.js';
import logger from '../utils/logger.js';

let octokit;

function getClient() {
  if (!octokit) {
    octokit = new Octokit({ auth: GITHUB_TOKEN });
  }
  return octokit;
}

/**
 * Busca todas as issues abertas do repositório.
 * Retorna apenas issues (filtra pull requests).
 */
export async function fetchOpenIssues() {
  const [owner, repo] = GITHUB_REPO.split('/');
  const client = getClient();

  logger.info(`Buscando issues abertas em ${GITHUB_REPO}...`);

  try {
    const issues = await client.paginate(client.rest.issues.listForRepo, {
      owner,
      repo,
      state: 'open',
      per_page: 100,
    });

    // Filtra pull requests (GitHub retorna PRs junto com issues)
    const onlyIssues = issues.filter((issue) => !issue.pull_request);

    logger.info(`Encontradas ${onlyIssues.length} issues abertas.`);
    return onlyIssues;
  } catch (error) {
    logger.error('Erro ao buscar issues do GitHub:', error.message);
    throw error;
  }
}

/**
 * Formata uma issue do GitHub para consumo interno.
 */
export function formatIssue(issue) {
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body || '',
    labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name)),
    url: issue.html_url,
    createdAt: issue.created_at,
    user: issue.user?.login || 'unknown',
  };
}
