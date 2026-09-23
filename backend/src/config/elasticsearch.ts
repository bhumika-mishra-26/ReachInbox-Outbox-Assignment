import { Client } from '@elastic/elasticsearch';
import { env } from './env';
import { logger } from './logger';

export const esClient = new Client({
  node: env.ELASTICSEARCH_NODE,
  // Single node dev configuration
  requestTimeout: 5000,
  maxRetries: 3,
});

export async function checkElasticsearchHealth(): Promise<boolean> {
  try {
    const health = await esClient.cluster.health();
    logger.info(`Elasticsearch status: ${health.status}`);
    return true;
  } catch (error) {
    logger.warn(`Elasticsearch healthcheck failed: ${(error as Error).message}`);
    return false;
  }
}
