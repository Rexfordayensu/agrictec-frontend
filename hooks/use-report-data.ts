import { useFarmStats } from '@/hooks/use-farm-stats';
import { buildReportData, type ReportData } from '@/lib/reports/build-report-data';
import { useFarmStore } from '@/store/farm-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import type { ReportType } from '@/types';

/** Returns a builder that turns the current stores into ReportData for any report type. */
export function useReportBuilder(): (type: ReportType, now?: Date) => ReportData {
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  const profile = useProfileStore((s) => s.profile);
  const stats = useFarmStats();
  const underReview = usePlatformStore((s) => s.underReview);
  return (type, now) => buildReportData(type, { records, momo, profile, stats, now, underReview });
}
