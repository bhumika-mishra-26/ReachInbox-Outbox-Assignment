import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { AuthenticatedUser } from '../types';

export class SearchController {
  /**
   * Search emails across recipient, subject, and body using Elasticsearch
   */
  public static async search(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;
    const query = (req.query.q as string) || '';
    const status = (req.query.status as string) || undefined;

    if (!query || query.trim().length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const results = await SearchService.searchEmails(query.trim(), user?.id, status);

    res.json({
      success: true,
      query,
      count: results.length,
      data: results,
    });
  }
}
