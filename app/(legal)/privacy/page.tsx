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
  title: 'Privacy Policy',
  description: 'What AgriCtec collects about farmers, why, who sees it and how to control it.',
};

const LINK = 'text-ink-green font-semibold hover:underline';

export default function PrivacyPage() {
  return (
    <article>
      <LegalHeader title="Privacy Policy" updated="2 November 2026">
        <p>
          AgriCtec helps farmers in Ghana keep farm records and build a financial identity they can
          use to reach lenders. This policy explains, in plain words, what information we collect
          about you, why we need it, who can see it and how you can control it. It applies to the
          AgriCtec app and website.
        </p>
        <p>
          We handle personal data in line with Ghana&apos;s Data Protection Act, 2012 (Act 843).
          Questions? Write to us at <ContactLink />.
        </p>
      </LegalHeader>

      <LegalSection id="collect" title="1. What we collect">
        <p>We only collect what you give us and what the app needs to work:</p>
        <LegalList>
          <li>
            <Term>Your account:</Term> your name, email address and password. Your password is
            stored only as a one-way code, so no one at AgriCtec can read it.
          </li>
          <li>
            <Term>Your farm profile:</Term> phone number, farm name, region, constituency and
            community, farm size, crops, farm type, cooperative or outgrower company, and a profile
            photo if you add one. If you choose to pin your farm on the map, we keep that location.
          </li>
          <li>
            <Term>Your Ghana Card:</Term> if you verify your identity, we keep only a masked version
            of the card number (most digits hidden) and a one-way fingerprint that lets us spot the
            same card used twice. We never store the full number.
          </li>
          <li>
            <Term>Your records:</Term> the farm income, expenses and Mobile Money transactions you
            enter. AgriCtec does not connect to your Mobile Money wallet; we only see what you type
            in.
          </li>
          <li>
            <Term>Crop Doctor and Assistant:</Term> the questions you ask, the answers you receive,
            and a small copy of each crop photo you check.
          </li>
          <li>
            <Term>Loans:</Term> the loans you apply for (amount, purpose, length, lender) and your
            AgriCtec score at the time, which the app works out from your records and profile.
          </li>
          <li>
            <Term>Payments:</Term> if you buy a plan, the payment reference, amount, method and
            status. Your card or Mobile Money details go straight to Paystack; we never see them.
          </li>
          <li>
            <Term>Technical information:</Term> when you last used the app, your sign-in sessions,
            and your internet (IP) address. We use the IP address only to stop abuse, such as too
            many sign-in attempts, and we delete it within a day.
          </li>
        </LegalList>
        <p>
          You can also try the app as a guest, without a name or email. A guest account is linked to
          your phone or browser so you can come back to it.
        </p>
      </LegalSection>

      <LegalSection id="use" title="2. Why we use it">
        <LegalList>
          <li>To run your account and show your farm records, reports and AgriCtec score.</li>
          <li>To check your identity and stop fraud, such as fake or borrowed Ghana Cards.</li>
          <li>To send your loan applications to the lender you choose.</li>
          <li>To give you weather, market prices, crop advice and answers to your questions.</li>
          <li>
            To send you messages you need, such as password reset codes and updates on your loan or
            verification, by email or SMS. You can turn off optional notifications in Settings.
          </li>
          <li>To take payment for plans and keep records of what was paid.</li>
          <li>To keep the service safe, fix problems and improve it.</li>
        </LegalList>
        <p>
          We use your information because you asked us to provide the service, because the law
          requires it, or because we have a fair reason to (such as preventing fraud). We do not
          sell your personal data, and we do not use it for advertising.
        </p>
      </LegalSection>

      <LegalSection id="share" title="3. Who can see it">
        <LegalList>
          <li>
            <Term>Lenders, when you apply.</Term> When you send a loan application, the lender you
            chose receives your name, region, the amount, purpose and length of the loan, and your
            AgriCtec score at the time. They decide whether to lend to you. We share nothing with a
            lender you have not applied to.
          </li>
          <li>
            <Term>Our team.</Term> AgriCtec staff can see farmer accounts to review Ghana Cards,
            handle loan applications and help with problems. To help you, they can view the app as
            you see it, but cannot change anything while they do. Changes staff make to accounts are
            recorded.
          </li>
          <li>
            <Term>Service providers</Term> who run parts of AgriCtec for us. They may only use your
            information to provide their service to us:
            <LegalList>
              <li>Render, Vercel, Cloudflare and Supabase: host the app and store its data.</li>
              <li>
                GitHub: keeps our nightly backups, which are locked with a password only we have.
              </li>
              <li>Brevo (email) and Arkesel (SMS): deliver our messages to you.</li>
              <li>Paystack: takes payments for plans.</li>
              <li>
                Smile ID: checks your Ghana Card number and name against the National Identification
                Authority&apos;s records. The full number is sent to them once and is not kept by
                us.
              </li>
              <li>
                An artificial intelligence (AI) provider: reads your Assistant questions, with a
                summary of your farm figures, and your Crop Doctor photos to produce an answer.
              </li>
              <li>
                Open-Meteo, MET Norway and OpenStreetMap: receive a place or map location (never
                your name) to return the weather and find places.
              </li>
            </LegalList>
          </li>
          <li>
            <Term>The authorities,</Term> only when the law requires it.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="where" title="4. Where it is stored">
        <p>
          Your data is stored on secure servers in Frankfurt, Germany, and some of our providers
          work from other countries. Whenever your data leaves Ghana, we use providers that protect
          it to standards at least as strong as Ghana&apos;s law requires.
        </p>
      </LegalSection>

      <LegalSection id="keep" title="5. How long we keep it">
        <LegalList>
          <li>We keep your account and farm data for as long as your account is open.</li>
          <li>
            You can delete your farm data at any time in Settings, under Account &amp; data, then
            Delete all my data. This clears your profile, records, Mobile Money, Crop Doctor
            results, chat and settings. Your sign-in, Ghana Card status and loan applications stay.
          </li>
          <li>
            To close your account completely, write to us at <ContactLink /> from the email on your
            account. We delete your account and all its data, usually within 30 days.
          </li>
          <li>
            The loan applications you sent stay on record after that, without your contact details,
            because lenders need a history of what they were asked for. Paystack keeps its own
            records of any payment you made.
          </li>
          <li>
            We make a backup of all data every night and keep each backup for 30 days, so deleted
            data is gone from our backups within 30 days too.
          </li>
          <li>Password reset codes expire after a short time and can be used only once.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="rights" title="6. Your rights">
        <p>Under Ghana&apos;s Data Protection Act you can:</p>
        <LegalList>
          <li>
            <Term>See your data:</Term> download a copy any time in Settings, under Account &amp;
            data, then Export my data.
          </li>
          <li>
            <Term>Correct it:</Term> edit your profile and records in the app, or ask us.
          </li>
          <li>
            <Term>Delete it:</Term> as described above.
          </li>
          <li>
            <Term>Object or ask questions:</Term> about how we use your data, by writing to{' '}
            <ContactLink />. We reply within 30 days.
          </li>
          <li>
            <Term>Complain:</Term> to Ghana&apos;s Data Protection Commission (
            <a
              href="https://dataprotection.org.gh"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              dataprotection.org.gh
            </a>
            ) if you are not happy with our answer.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="security" title="7. How we protect it">
        <p>
          All connections to AgriCtec are encrypted. Passwords are stored as one-way codes, full
          Ghana Card numbers are never stored, sign-ins are protected against guessing, and only
          staff who need access have it. No system is perfectly safe; if a breach puts your data at
          risk, we will tell you and the Data Protection Commission as the law requires.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="8. Cookies">
        <p>
          We use only the cookies the app needs to keep you signed in and to remember where you left
          off. Your phone or browser also keeps some app settings, such as your theme. We do not use
          advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection id="children" title="9. Children">
        <p>
          AgriCtec is for adults aged 18 or over. We do not knowingly collect information about
          children. If you believe a child has an account, please tell us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes to this policy">
        <p>
          If we change this policy, we will update the date above. For important changes, we will
          tell you in the app or by email before they take effect. This policy works together with
          our{' '}
          <Link href="/terms" className={LINK}>
            Terms of Use
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="contact" title="11. Contact us">
        <p>
          For any question about your privacy or your data, write to <ContactLink />.
        </p>
      </LegalSection>
    </article>
  );
}
