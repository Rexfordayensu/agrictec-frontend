import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { MomoNetwork } from '@/types';

/** Each network's mark (public/images/networks): MTN MoMo, Telecel, AirtelTigo. */
const LOGOS: Record<MomoNetwork, string> = {
  MTN: '/images/networks/mtn.png',
  Telecel: '/images/networks/telecel.png',
  AirtelTigo: '/images/networks/airteltigo.png',
};

/**
 * A network's logo on a small white tile. Decorative by default (the network's name is always
 * written next to it); pass `label` when the logo stands alone.
 */
export function NetworkLogo({
  network,
  size = 20,
  label,
  className,
}: {
  network: MomoNetwork;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <Image
      src={LOGOS[network]}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      className={cn('shrink-0 rounded-[30%] bg-white object-cover ring-1 ring-black/10', className)}
    />
  );
}
