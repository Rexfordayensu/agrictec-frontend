'use client';

import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { getRecommendations } from '@/lib/ai/recommendations';
import { usePlatformStore } from '@/store/platform-store';

export function AiRecommendations() {
  const stats = useFarmStats();
  const flags = usePlatformStore((state) => state.flags);
  const recommendations = getRecommendations(stats)
    .filter((item) => {
      if (
        !flags.loans &&
        (['history', 'verify-card', 'loan-ready'].includes(item.id) ||
          item.cta.href.startsWith('/loans'))
      )
        return false;
      if (item.cta.href.startsWith('/yield-predictor')) return flags.yieldPredictor;
      if (item.cta.href.startsWith('/assistant')) return flags.aiAssistant;
      if (item.cta.href.startsWith('/crop-doctor')) return flags.cropDoctor;
      return true;
    })
    .slice(0, 2);
  return (
    <Card className="farmer-dashboard-next-steps farmer-dashboard-panel">
      <CardHeader>
        <div>
          <CardTitle>Your next steps</CardTitle>
          <CardSub>Based on all your records and profile</CardSub>
        </div>
      </CardHeader>
      {recommendations.length === 0 ? (
        <p className="farmer-dashboard-all-set">
          <CircleCheck size={20} aria-hidden="true" />
          You&apos;re up to date. Keep recording your farm activity.
        </p>
      ) : (
        <ul className="farmer-dashboard-suggestions">
          {recommendations.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <span className="farmer-dashboard-suggestion-icon">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <Link href={item.cta.href} className="farmer-dashboard-text-link">
                    {item.cta.label}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
