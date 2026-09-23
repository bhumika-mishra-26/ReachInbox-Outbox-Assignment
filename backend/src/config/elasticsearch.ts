import { Client } from '@elastic/elasticsearch';
import { env } from './env';
import { logger } from './logger';

export const esClient = new Client({
  node: env.ELASTICSEARCH_NODE,
  auth: env.ELASTICSEARCH_API_KEY
    ? { apiKey: env.ELASTICSEARCH_API_KEY }
    : undefined,
  requestTimeout: 5000,
  maxRetries: 3,
});

export async function checkElasticsearchHealth(): Promise<boolean> {
  try {
    const ping = await esClient.ping();
    logger.info(`Elasticsearch Cloud ping status: ${ping ? 'online' : 'offline'}`);
    return ping;
  } catch (error) {
    logger.warn(`Elasticsearch healthcheck failed: ${(error as Error).message}`);
    return false;
  }
}
