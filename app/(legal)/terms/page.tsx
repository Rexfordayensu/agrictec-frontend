import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ContactLink,
  LegalHeader,
  LegalList,
  LegalSection,
  Term,
} from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'The rules for using AgriCtec, what it does and does not promise, and your rights.',
};

const LINK = 'text-ink-green font-semibold hover:underline';

export default function TermsPage() {
  return (
    <article>
      <LegalHeader title="Terms of Use" updated="2 November 2026">
        <p>
          These terms are the agreement between you and AgriCtec (&quot;we&quot;, &quot;us&quot;)
          for using the AgriCtec app and website. By creating an account or using the app as a
          guest, you agree to them. Please read them together with our{' '}
          <Link href="/privacy" className={LINK}>
            Privacy Policy
          </Link>
          , which explains how we handle your information.
        </p>
      </LegalHeader>

      <LegalSection id="service" title="1. What AgriCtec does">
        <p>
          AgriCtec helps farmers keep farm and Mobile Money records, build an AgriCtec score from them,
          verify their identity, apply to partner lenders, and get weather, market prices and crop
          advice. Some features need a paid plan.
        </p>
      </LegalSection>

      <LegalSection id="account" title="2. Your account">
        <LegalList>
          <li>You must be 18 or older to use AgriCtec.</li>
          <li>
            Give true and complete information, and keep it up to date. Your AgriCtec score and loan
            applications depend on it.
          </li>
          <li>
            Keep your password secret. You are responsible for what happens in your account. Tell us
            at once at <ContactLink /> if you think someone else has used it.
          </li>
          <li>One account per person. Do not create accounts for other people without them.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="loans" title="3. The AgriCtec score and loans">
        <LegalList>
          <li>
            <Term>AgriCtec is not a lender.</Term> We do not lend money or decide who gets a loan.
            We pass your application to the lender you choose, and that lender alone decides.
          </li>
          <li>
            Your AgriCtec score is an estimate worked out from what you have entered. It is
            not a credit bureau report and does not guarantee you a loan.
          </li>
          <li>
            Repayment amounts shown in the app are estimates. The lender sets the final amount,
            interest, fees and terms, in their own agreement with you. Read it carefully before you
            accept.
          </li>
          <li>
            Any loan is between you and the lender. Repay the lender as agreed; AgriCtec does not
            collect repayments.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="advice" title="4. Advice and information">
        <p>
          The Assistant, Crop Doctor, yield predictions, weather forecasts and market prices are
          there to help you decide, not to decide for you. They come from computer models and
          outside sources, and they can be wrong or out of date. Before you spend money or apply
          chemicals, check with an agricultural extension officer or another expert you trust.
          Always follow the label on any farm chemical.
        </p>
      </LegalSection>

      <LegalSection id="plans" title="5. Plans and payments">
        <LegalList>
          <li>
            The prices of paid plans are shown in Ghana cedis (GHS) in the app before you pay.
          </li>
          <li>
            Payments are made through Paystack, by Mobile Money or card. A plan starts once Paystack
            confirms the payment.
          </li>
          <li>
            A plan lasts one month. It does not renew by itself; when it ends, your account goes
            back to the free plan, and your data stays.
          </li>
          <li>
            Payments are not refunded once a plan has started, unless we charged you by mistake or
            the law requires it. If something went wrong with a payment, write to <ContactLink />{' '}
            with the payment reference.
          </li>
          <li>
            We may change plan prices or features. Changes never affect a plan you have already paid
            for.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="rules" title="6. What you must not do">
        <LegalList>
          <li>Enter false records, or another person&apos;s Ghana Card or details.</li>
          <li>Use AgriCtec to deceive a lender or anyone else.</li>
          <li>Try to get into accounts or parts of the system that are not yours.</li>
          <li>
            Overload, copy or interfere with the service, for example with automated requests.
          </li>
          <li>Use the service for anything illegal in Ghana.</li>
        </LegalList>
        <p>
          If you break these rules, we may suspend or close your account and, where there is fraud,
          tell the lenders involved and the authorities.
        </p>
      </LegalSection>

      <LegalSection id="data" title="7. Your data">
        <p>
          The records you enter belong to you. You allow us to store and use them to run the service
          for you, as described in our Privacy Policy. You can download them or delete them at any
          time in Settings.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="8. Availability and changes">
        <p>
          We work to keep AgriCtec running, but we cannot promise it will always be available or
          free of errors. It may be paused for maintenance. We may add, change or remove features,
          and we will tell you before any change that affects a plan you paid for.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="9. Our responsibility">
        <p>
          We provide AgriCtec with care, but as far as the law allows, we are not responsible for
          losses that come from decisions you make using the app (such as crop losses or loan
          decisions), from a lender&apos;s decisions, or from information supplied by outside
          sources. Where we are responsible, our total responsibility is limited to the amount you
          paid us in the last 12 months. Nothing in these terms takes away rights you have under
          Ghana&apos;s consumer protection laws.
        </p>
      </LegalSection>

      <LegalSection id="ending" title="10. Closing your account">
        <p>
          You can stop using AgriCtec at any time and ask us to close your account by writing to{' '}
          <ContactLink />. We may close or suspend an account that breaks these terms. What happens
          to your data then is explained in our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection id="law" title="11. The law that applies">
        <p>
          These terms are governed by the laws of the Republic of Ghana. If we have a disagreement,
          we will first try to settle it by talking with you. If we cannot, the courts of Ghana will
          decide.
        </p>
      </LegalSection>

      <LegalSection id="updates" title="12. Changes to these terms">
        <p>
          We may update these terms. We will change the date above and, for important changes, tell
          you in the app or by email before they take effect. If you keep using AgriCtec after that,
          the new terms apply.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact us">
        <p>
          Questions about these terms? Write to <ContactLink />.
        </p>
      </LegalSection>
    </article>
  );
}
