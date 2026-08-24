import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = { title: "Privacy Policy" };

const EFFECTIVE = "August 24, 2026";

const COLLECT = [
  {
    title: "Account and household",
    body: "When you have a portal account we keep the information needed to recognize you as a resident or staff member: your name, email, household, and lot. We may also have a phone number if you or the office added one. You choose your own password. Staff accounts also include a role (for example, office or field staff).",
  },
  {
    title: "HOA payments",
    body: "If you pay an HOA fee or other billed amount through the website or The Grid, the payment runs on Stripe. You may pay by card or, when Stripe offers it, a linked bank account. Unity Grid does not store full card numbers or bank account numbers. Stripe sends us a confirmation so we can mark the invoice paid — typically the amount, date, payment method type, and a reference such as the last four digits.",
  },
  {
    title: "Messages and attachments",
    body: "Messages you send the office — and replies — are stored with your account so the conversation is not lost. If you attach a photo or file, we keep that attachment with the thread.",
  },
  {
    title: "Requests and registrations",
    body: "Maintenance requests, architectural applications, and compliance submissions include the details you type and any photos or documents you attach. Pet and vehicle registrations include the information you enter (for example, a pet’s name and rabies tag, or a vehicle’s plate) and any photos you upload.",
  },
  {
    title: "Documents library",
    body: "The portal can show association documents — rules, minutes, notices, and similar files — to people who are allowed to see them. When you open or download a document, that use is part of running the portal for your community.",
  },
  {
    title: "The public website",
    body: "You can read the public pages without an account. If you use the contact form we receive the community you selected, your name, email, phone if you add one, the topic, and your message so the office can reply.",
  },
  {
    title: "Optional Face ID and device biometrics",
    body: "On iPhone you may lock The Grid with Face ID or the device passcode. That check happens on your phone. We do not receive your face, fingerprint, or other biometric data.",
  },
  {
    title: "Optional push notifications",
    body: "If you turn on notifications, Apple uses a device token so we can send alerts (for example, a message or a request update). You can turn notifications off in iPhone settings. If you never enable them, we do not use a push token for your device.",
  },
  {
    title: "Technical records that keep the service running",
    body: "Our hosts record basic technical information needed to operate and secure the website and app — for example an IP address, browser or device type, and the time of a request. We do not run advertising networks, and we do not use analytics or tracking products to follow you across other apps or sites.",
  },
];

export default function PrivacyPage() {
  return (
    <main>
      <PageHero
        eyebrow="Privacy Policy"
        title="How we handle information you share with us."
        intro="This policy covers the Unity Grid Management website and The Grid iPhone app — the same resident and staff portal, on the phone and on the web. It is written in plain language so you can see what we collect, why, and how to reach the office."
      />

      <section className="mx-auto mt-[60px] grid max-w-[1320px] items-start gap-10 px-6 md:grid-cols-[1fr_320px] md:gap-14 md:px-11">
        <article className="grid gap-12">
          <PolicySection n="1" title="Who we are and what this policy covers">
            <p>
              Unity Grid Management (Unity Grid Management LLC) is the management
              office for homeowners associations, including Sofi Lakes. We run{" "}
              <a href="https://unitygridmanagement.com" className="text-moss hover:text-ink">
                unitygridmanagement.com
              </a>{" "}
              and The Grid, an iPhone app (bundle ID{" "}
              <span className="break-all">com.pineapple.xpress.The-Grid</span>
              ). Both are the HOA portal: residents pay fees, send requests, and
              message the office; staff use the same system to manage the
              association.
            </p>
            <p>
              This policy applies to personal information we handle when you use
              the public website, create or use a portal account, or use The Grid
              app. It does not cover other companies’ websites or apps that we
              do not operate — including Stripe’s checkout pages and Apple’s App
              Store — which have their own policies.
            </p>
          </PolicySection>

          <PolicySection n="2" title="Information we collect and why">
            <p>
              We collect what we need to run the portal for your household and
              the association — not to advertise to you or sell a list of
              neighbors. The main categories are:
            </p>
            <div className="grid gap-3.5">
              {COLLECT.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[14px] border border-line bg-white px-6 py-[22px]"
                >
                  <div className="mb-1.5 font-display text-[17px] font-semibold tracking-[-0.02em]">
                    {item.title}
                  </div>
                  <p className="text-[15px] leading-[1.6] text-body">{item.body}</p>
                </div>
              ))}
            </div>
          </PolicySection>

          <PolicySection n="3" title="How we use it">
            <p>We use this information to:</p>
            <ul className="grid gap-3 text-[17px] leading-[1.62] text-body">
              <li className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                <span>Run the HOA portal — sign-in, your household and lot, and the documents you are allowed to see.</span>
              </li>
              <li className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                <span>Take HOA payments and show you what is paid or still owed.</span>
              </li>
              <li className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                <span>Receive and work maintenance, architectural, and compliance requests, including the photos and files you attach.</span>
              </li>
              <li className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                <span>Keep pet and vehicle registrations the association requires.</span>
              </li>
              <li className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                <span>Carry messages between residents and the office, and answer the public contact form.</span>
              </li>
              <li className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                <span>Send optional push notifications and ordinary account email (for example, an invite to set your password).</span>
              </li>
              <li className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                <span>Keep the service secure — confirm it is you signing in, and look into suspected misuse.</span>
              </li>
            </ul>
            <p>
              We do not use your information to show you ads, and we do not
              build marketing profiles from portal activity.
            </p>
          </PolicySection>

          <PolicySection n="4" title="When we share it">
            <p>
              We do not sell your personal information. We share it only when it
              is needed to run the association or required by law.
            </p>
            <ul className="grid gap-3 text-[17px] leading-[1.62] text-body">
              <li className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                <span>
                  <strong className="font-semibold text-ink">The office and the board.</strong>{" "}
                  Staff and, when the association’s work requires it, board
                  members see the records needed to manage your community —
                  requests, messages, registrations, and account status. They
                  see this because they are doing that work, not as a public
                  listing.
                </span>
              </li>
              <li className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                <span>
                  <strong className="font-semibold text-ink">Service providers.</strong>{" "}
                  Supabase hosts our database, sign-in, and file storage. Stripe
                  processes payments. Apple distributes The Grid through the App
                  Store and TestFlight and delivers push notifications if you
                  turn them on. The company that hosts the website carries the
                  traffic needed to show the pages. These companies process
                  information to provide their service to us and have their own
                  privacy policies.
                </span>
              </li>
              <li className="grid grid-cols-[8px_1fr] items-start gap-3.5">
                <span className="mt-2 h-2 w-2 rounded-full bg-moss" />
                <span>
                  <strong className="font-semibold text-ink">Legal and safety.</strong>{" "}
                  We may share information if we are required to by law, a court
                  order, or a government request, or if we need to protect the
                  association, residents, or the service from fraud or harm.
                </span>
              </li>
            </ul>
          </PolicySection>

          <PolicySection n="5" title="How long we keep it">
            <p>
              Association records — owner and household information, lots,
              invoices and payment confirmations, requests, messages, photos,
              and uploaded files — are kept while we manage the community and
              for as long as the association needs them for accounting,
              collections, and ordinary recordkeeping.
            </p>
            <p>
              If you move or close a portal login, some records stay with the
              association’s files (for example, a paid invoice or an approved
              architectural application). We do not keep payment card numbers,
              because we never receive the full number. Device biometric data
              never leaves your phone, so we have nothing of that kind to retain.
            </p>
          </PolicySection>

          <PolicySection n="6" title="Security">
            <p>
              We use reasonable safeguards for a hosted portal: signed-in areas
              sit behind an account, connections to the website and app use
              encryption in transit, and files live in our storage host rather
              than in email. You choose your own password; we do not mail you
              one. No method of storage or transmission is completely secure.
              If you think someone else has used your account, contact the
              office so we can help you reset access.
            </p>
          </PolicySection>

          <PolicySection n="7" title="Children">
            <p>
              The website and The Grid are for adult residents, owners, and
              staff. They are not directed at children under 13, and we do not
              knowingly collect personal information from children under 13. If
              you believe a child has given us information, contact the office
              and we will remove it.
            </p>
          </PolicySection>

          <PolicySection n="8" title="Your choices, and how to access or delete information">
            <p>
              You can sign in to review much of what the portal holds for your
              household — your account details, requests, messages, pets,
              vehicles, and documents. On the phone you can leave Face ID off
              and leave push notifications off.
            </p>
            <p>
              To correct something, close a login, or ask us to delete
              information, contact the office. We will help where we can. Some
              records belong to the association’s books and files and may need
              to be kept even after a portal login is turned off.
            </p>
          </PolicySection>

          <PolicySection n="9" title="California and other U.S. notices">
            <p>
              We operate from Texas and offer the website and The Grid to people
              in the United States. We do not sell personal information.
            </p>
            <p>
              If you are a California resident, you may ask us what personal
              information we have about you and ask us to delete it, except
              where the association must keep a record. We will not treat you
              worse for making that request. Send it the same way you would any
              other request — email, phone, or the contact page. We do not offer
              a “do not sell” toggle because we do not sell this information in
              the first place.
            </p>
          </PolicySection>

          <PolicySection n="10" title="Changes to this policy">
            <p>
              If we change this policy we will post the update on this page and
              change the effective date. For a change that materially affects
              how we use information we already have, we will also note it for
              people who use the portal — for example with a notice when you
              sign in. The current version is always the one at{" "}
              <a href="https://unitygridmanagement.com/privacy" className="text-moss hover:text-ink">
                unitygridmanagement.com/privacy
              </a>
              .
            </p>
          </PolicySection>

          <PolicySection n="11" title="How to contact us">
            <p>
              Questions about this policy, or a request to access or delete
              information, go to the management office.
            </p>
            <div className="rounded-[14px] border border-line bg-white px-6 py-7">
              <div className="font-display text-xl font-semibold tracking-[-0.02em]">
                Unity Grid Management LLC
              </div>
              <div className="mt-3 grid gap-1 text-[17px] leading-[1.7] text-body">
                <span>7880 Morrison Road, Katy, Texas 77493</span>
                <span>
                  Phone:{" "}
                  <a href="tel:7132083539" className="text-moss hover:text-ink">
                    713-208-3539
                  </a>
                </span>
                <span>
                  Email:{" "}
                  <a
                    href="mailto:info@unitygridmanagement.com"
                    className="text-moss hover:text-ink"
                  >
                    info@unitygridmanagement.com
                  </a>
                </span>
                <span>Hours: Monday–Friday, 9AM–5PM</span>
                <span>
                  Contact form:{" "}
                  <Link href="/contact" className="text-moss hover:text-ink">
                    unitygridmanagement.com/contact
                  </Link>
                </span>
              </div>
            </div>
          </PolicySection>

          <PolicySection n="12" title="Effective date">
            <p>
              This Privacy Policy is effective {EFFECTIVE}.
            </p>
          </PolicySection>
        </article>

        <aside className="grid gap-3.5 md:sticky md:top-[104px]">
          <div className="rounded-[14px] bg-ink p-7 text-white">
            <div className="mb-[18px] text-xs font-bold tracking-[0.08em] text-white/55 uppercase">
              Effective {EFFECTIVE}
            </div>
            <div className="mb-2 font-display text-[22px] leading-[1.2] font-semibold tracking-[-0.02em]">
              A question about your information?
            </div>
            <p className="mb-[18px] text-[15px] leading-[1.6] text-white/70">
              The office can look up your household, correct a record, or help
              close a login. Same address as the rest of Unity Grid.
            </p>
            <Link
              href="/contact"
              className="inline-block rounded-lg bg-white px-5 py-[13px] text-[15px] font-semibold text-ink transition-colors hover:bg-cream"
            >
              Contact the office
            </Link>
          </div>
          <div className="rounded-[14px] border border-line bg-white p-7">
            <div className="mb-2 font-display text-xl font-semibold tracking-[-0.02em]">
              What this covers
            </div>
            <p className="text-[15px] leading-[1.6] text-body">
              The public website and The Grid iPhone app — one portal for
              residents and staff of communities we manage, including Sofi
              Lakes.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function PolicySection({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <h2 className="font-display text-[26px] font-semibold tracking-[-0.03em] md:text-[30px]">
        <span className="mr-3 text-faint">{n}.</span>
        {title}
      </h2>
      <div className="grid max-w-[72ch] gap-[18px] text-[17px] leading-[1.62] text-body">
        {children}
      </div>
    </section>
  );
}
