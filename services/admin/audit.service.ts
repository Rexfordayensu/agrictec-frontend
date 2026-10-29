// Read-only access to the audit trail through the API. There is no update or delete anywhere:
// the database itself refuses them.

import { api } from '@/services/api';
import type { AuditEntry, AuditFilter, Paged } from '@/types/admin';

export const AUDIT_PAGE_SIZE = 50;

const filterQuery = (filter: AuditFilter) => ({
  actorId: filter.actorId,
  action: filter.action,
  group: filter.group,
  targetType: filter.targetType,
  targetId: filter.targetId,
  from: filter.from,
  to: filter.to,
  search: filter.search,
});

export const auditService = {
  /** Newest first, one page at a time. */
  async list(
    filter: AuditFilter = {},
    page = 1,
    pageSize = AUDIT_PAGE_SIZE,
  ): Promise<Paged<AuditEntry>> {
    return api<Paged<AuditEntry>>('/admin/audit', {
      query: { ...filterQuery(filter), page, pageSize },
    });
  },

  /** The database keeps every entry, so nothing is ever moved to an archive. */
  async archiveInfo(): Promise<{ count: number; oldest?: string; newest?: string }> {
    return { count: 0 };
  },

  /** Every matching entry, oldest first, as JSON or CSV. The export is itself logged. */
  async exportFiltered(
    filter: AuditFilter,
    format: 'json' | 'csv',
  ): Promise<{ filename: string; content: string }> {
    const result = await api<{ filename: string; content: string }>('/admin/audit/export', {
      method: 'POST',
      body: { filter: filterQuery(filter), format },
    });
    // Excel needs the byte-order mark to read accents (JSON keeps it out).
    return format === 'csv' && !result.content.startsWith('﻿')
      ? { ...result, content: `﻿${result.content}` }
      : result;
  },

  /** The people who appear in the log (for the actor filter), newest activity first. */
  async actors(): Promise<{ id: string; name: string; role: AuditEntry['actorRole'] }[]> {
    return api('/admin/audit/actors');
  },

  /** JSON of every entry in the range, oldest first. The export is logged. */
  async exportJSON(range: Pick<AuditFilter, 'from' | 'to'> = {}): Promise<string> {
    return (await auditService.exportFiltered(range, 'json')).content;
  },
};
