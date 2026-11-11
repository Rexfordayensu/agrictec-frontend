'use client';

import { useEffect, useState } from 'react';
import { backupService } from '@/services/admin/backup.service';

let asked: Promise<boolean> | null = null;

/**
 * Whether the demo world exists: only when the API runs in local development. False until the
 * API says so, and always false on the live platform.
 */
export function useDemoDataAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    asked ??= backupService.systemStatus().then(
      (status) => status.demoData,
      () => {
        asked = null;
        return false;
      },
    );
    void asked.then((value) => {
      if (active) setAllowed(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return allowed;
}
