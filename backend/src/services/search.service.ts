import { esClient } from '../config/elasticsearch';
import { logger } from '../config/logger';

const EMAIL_INDEX = 'emails';

export class SearchService {
  /**
   * Initializes the emails Elasticsearch index and schema if not present
   */
  public static async ensureIndex(): Promise<void> {
    try {
      const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
      if (!exists) {
        await esClient.indices.create({
          index: EMAIL_INDEX,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              senderId: { type: 'keyword' },
              userId: { type: 'keyword' },
              scheduledFor: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        });
        logger.info(`Elasticsearch: Created '${EMAIL_INDEX}' index.`);
      }
    } catch (error) {
      logger.warn(`Elasticsearch ensureIndex error (will retry when running): ${(error as Error).message}`);
    }
  }

  /**
   * Indexes or updates an email record in Elasticsearch
   */
  public static async indexEmail(email: {
    id: string;
    recipient: string;
    subject: string;
    body: string;
    status: string;
    senderId: string;
    userId?: string | null;
    scheduledFor: Date;
    sentAt?: Date | null;
    createdAt?: Date;
  }): Promise<void> {
    try {
      await esClient.index({
        index: EMAIL_INDEX,
        id: email.id,
        document: {
          id: email.id,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          status: email.status,
          senderId: email.senderId,
          userId: email.userId || undefined,
          scheduledFor: email.scheduledFor,
          sentAt: email.sentAt || undefined,
          createdAt: email.createdAt || new Date(),
        },
      });
    } catch (error) {
      // Quietly handle local environment where Elasticsearch service isn't running
      logger.debug(`Elasticsearch index skipped for ${email.id}: ${(error as Error).message}`);
    }
  }

  /**
   * Performs multi-field search across recipient, subject, and body
   */
  public static async searchEmails(query: string, userId?: string, status?: string): Promise<any[]> {
    try {
      const mustClauses: any[] = [
        {
          multi_match: {
            query,
            fields: ['recipient^2', 'subject^2', 'body'],
            fuzziness: 'AUTO',
          },
        },
      ];

      if (userId) {
        mustClauses.push({ term: { userId } });
      }
      if (status) {
        mustClauses.push({ term: { status } });
      }

      const response = await esClient.search({
        index: EMAIL_INDEX,
        query: {
          bool: {
            must: mustClauses,
          },
        },
        size: 50,
      });

      return response.hits.hits.map((hit) => hit._source);
    } catch (error) {
      logger.warn(`Elasticsearch search failed: ${(error as Error).message}`);
      return [];
    }
  }
}
