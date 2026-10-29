'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Download, Megaphone, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { BulkActionBar } from '@/components/admin/shared/bulk-action-bar';
import { Button } from '@/components/ui/button';
import type { FarmerAbilities } from '@/lib/admin/farmer-list';
import { downloadFile } from '@/lib/export/csv';
import { farmersService } from '@/services/admin/farmers.service';
import type { FarmerAccount } from '@/types/admin';

export const csvFileName = (label: string) =>
  `agrictec-farmers-${label}-${new Date().toISOString().slice(0, 10)}.csv`;

/**
 * Actions for the selected farmers, each shown only when the role can take it (and checked again
 * by the service). Suspend and tag open dialogs that list exactly who is affected.
 */
export function FarmersBulkActions({
  selected,
  abilities,
  onClear,
  onSuspend,
  onTag,
}: {
  selected: FarmerAccount[];
  abilities: FarmerAbilities;
  onClear: () => void;
  onSuspend: (farmers: FarmerAccount[]) => void;
  onTag: (farmers: FarmerAccount[]) => void;
}) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  async function exportSelected() {
    setExporting(true);
    try {
      const csv = await farmersService.exportCSV(selected.map((f) => f.userId));
      downloadFile(csv, csvFileName('selected'));
      toast.success(`Exported ${selected.length} farmer${selected.length === 1 ? '' : 's'}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  }

  /**
   * Announcements target everyone, regions or crops, so this pre-fills the selected farmers'
   * regions on the announcements page.
   */
  function announce() {
    const regions = [...new Set(selected.map((f) => f.profile.region))].sort();
    router.push(`/admin/announcements?new=1&regions=${encodeURIComponent(regions.join(','))}`);
  }

  return (
    <BulkActionBar count={selected.length} onClear={onClear}>
      {abilities.export && (
        <Button
          size="sm"
          variant="ghost"
          icon={Download}
          loading={exporting}
          onClick={() => void exportSelected()}
        >
          Export CSV
        </Button>
      )}
      {abilities.tag && (
        <Button size="sm" variant="ghost" icon={Tag} onClick={() => onTag(selected)}>
          Add tag
        </Button>
      )}
      {abilities.announce && (
        <Button size="sm" variant="ghost" icon={Megaphone} onClick={announce}>
          Send announcement
        </Button>
      )}
      {abilities.suspend && (
        <Button size="sm" variant="danger" icon={Ban} onClick={() => onSuspend(selected)}>
          Suspend
        </Button>
      )}
    </BulkActionBar>
  );
}
