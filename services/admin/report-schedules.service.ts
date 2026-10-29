// Reports emailed on a schedule (reports.export): the report's CSV every Monday or every 1st of
// the month at 07:00 Ghana time. The API sends them; every change is audited.

import type { ReportId } from '@/lib/admin/admin-reports';
import { api } from '@/services/api';

export type ScheduleFrequency = 'weekly' | 'monthly';

export interface ReportSchedule {
  id: string;
  reportId: ReportId;
  reportTitle: string;
  frequency: ScheduleFrequency;
  recipients: string[];
  active: boolean;
  nextRunAt: string;
  lastSentAt?: string;
  /** "sent to 3", or "failed: <reason>". */
  lastStatus?: string;
  createdAt: string;
}

export interface ScheduleList {
  schedules: ReportSchedule[];
  /** Without email on the server, nothing can be sent (schedules still save). */
  emailEnabled: boolean;
}

export const reportSchedulesService = {
  async list(): Promise<ScheduleList> {
    return api<ScheduleList>('/admin/reports/schedules');
  },

  async create(
    reportId: ReportId,
    frequency: ScheduleFrequency,
    recipients: string[],
  ): Promise<ReportSchedule> {
    return api<ReportSchedule>('/admin/reports/schedules', {
      method: 'POST',
      body: { reportId, frequency, recipients },
    });
  },

  async update(
    id: string,
    patch: Partial<Pick<ReportSchedule, 'frequency' | 'recipients' | 'active'>>,
  ): Promise<ReportSchedule> {
    return api<ReportSchedule>(`/admin/reports/schedules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: patch,
    });
  },

  async remove(id: string): Promise<void> {
    await api(`/admin/reports/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
