import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="size-11" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    </div>
  );
}
