import Link from 'next/link';
import {
  ArrowRight,
  ChartNoAxesCombined,
  FileText,
  Flag,
  Layers,
  LockKeyhole,
  Users,
  Zap,
} from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TakeTourButton } from '@/components/tour/take-tour-button';
import { IconTile } from '@/components/ui/icon-tile';

const benefits = [
  {
    icon: ChartNoAxesCombined,
    title: 'Track your farm finances',
    description:
      'Record sales, expenses and MoMo transactions, and see your cash flow in one place.',
  },
  {
    icon: Layers,
    title: 'Build financial history',
    description:
      'Keep consistent records, attach evidence and prepare financial reports for loan applications.',
  },
  {
    icon: Zap,
    title: 'Explore finance',
    description: 'Compare published lender products and their requirements before you apply.',
  },
];

export function AboutCard() {
  return (
    <div className="about-content">
      <Card className="about-hero" aria-label="Introducing AgriCtec">
        <div className="about-hero-content">
          <BrandLogo subtitle="Digital identity" className="about-brand" />
          <p>
            AgriCtec helps farmers in Ghana turn everyday farm records into a digital financial
            identity. Track your income and expenses, build a reliable transaction history and
            prepare the records lenders need.
          </p>
          <div className="about-badges">
            <Badge>
              <Flag size={16} aria-hidden="true" />
              Built for Ghana{' '}
              <svg
                width="24"
                height="16"
                viewBox="0 0 24 16"
                role="img"
                aria-label="Ghana"
                className="shrink-0 rounded-sm"
              >
                <path fill="#ce1126" d="M0 0h24v6H0z" />
                <path fill="#fcd116" d="M0 5.33h24v5.34H0z" />
                <path fill="#006b3f" d="M0 10.67h24V16H0z" />
                <path
                  fill="#111"
                  d="m12 5 1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3Z"
                />
              </svg>
            </Badge>
            <Badge color="gold">
              <LockKeyhole size={16} aria-hidden="true" />
              You control your data
            </Badge>
          </div>
          {/* New to AgriCtec, or want a reminder: the 6-step tour of the app. */}
          <TakeTourButton className="about-tour-button mt-4" />
        </div>
        <svg className="about-leaf" viewBox="0 0 140 200" fill="none" aria-hidden="true">
          <path
            d="M12 188C-2 96 49 28 132 7C143 97 94 156 12 188Z"
            fill="currentColor"
            fillOpacity=".35"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M11 189L112 39" stroke="currentColor" strokeWidth="2" />
        </svg>
      </Card>
      <Card className="about-benefits" aria-labelledby="about-benefits-heading">
        <h3 id="about-benefits-heading">What AgriCtec helps you do</h3>
        <div className="about-benefit-grid">
          {benefits.map(({ icon, title, description }) => (
            <div className="about-benefit" key={title}>
              <IconTile icon={icon} size="lg" />
              <div>
                <h4>{title}</h4>
                <p>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="about-bottom-grid">
        <Card className="about-policies" aria-labelledby="about-policies-heading">
          <header className="about-card-heading">
            <IconTile icon={FileText} size="lg" />
            <div>
              <h3 id="about-policies-heading">Our policies</h3>
              <p>Read how we handle your data and the rules for using AgriCtec.</p>
            </div>
          </header>
          <nav aria-label="AgriCtec policies">
            <Link href="/privacy">
              <FileText size={18} aria-hidden="true" />
              <span>Privacy Policy</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/terms">
              <FileText size={18} aria-hidden="true" />
              <span>Terms of Use</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </nav>
        </Card>
        <Card className="about-company" aria-labelledby="about-company-heading">
          <header className="about-card-heading">
            <IconTile icon={Users} />
            <h3 id="about-company-heading">About the company</h3>
          </header>
          <p>
            AgriCtec is a digital agriculture platform built to help farmers in Ghana manage their
            farms and make their financial activity easier to understand. Farm records, MoMo
            history, evidence and identity checks help farmers present a clearer picture of their
            business.
          </p>
          <p>
            Weather updates, market information, the AI assistant, crop doctor and yield estimates
            support everyday farm planning. Your AgriCtec score reflects the quality and consistency
            of your records. Loan applications depend on your transaction history and each
            lender&apos;s requirements; the score does not approve a loan.
          </p>
        </Card>
      </div>
    </div>
  );
}
