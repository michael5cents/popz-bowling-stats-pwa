# Popz Bowling — Customer-facing policy drafts

**DRAFT FOR BUSINESS/LEGAL REVIEW ONLY — NOT APPROVED AND NOT PUBLISHED.**
Prepared November 15, 2026. The bracketed items MUST be resolved before go-live. Do not display this draft as an accepted policy or copy it into the public app without owner/legal approval.

## Draft purchase and plan disclosure

**Popz Bowling — Free and Lifetime Pro**

You can download/install Popz Bowling and use its basic scoring and local bowling history for free. New installations receive **30 days of Pro** features, beginning at the first app launch under the new commercial release. No payment method is needed to begin the trial. Your trial **does not automatically convert into a paid purchase**.

At the end of the 30 days, Free scoring and locally saved history remain available. Pro features require an optional **one-time $9.99 USD Lifetime Pro purchase**. This is **not a subscription**, and there are no automatic renewals or monthly charges. [APPROVE PRICE/TAX DISCLOSURE: $9.99 total or $9.99 + applicable sales tax, depending on the seller's actual registrations.]

Lifetime Pro is associated with the **Google/Firebase account used to buy it** and follows that account to supported devices. Existing qualifying Founder Pro users retain Pro without charge. A purchase confirmation and billing receipt are provided through Stripe [VERIFY CUSTOMER EMAIL AND RECEIPT CONFIGURATION].

Lifetime Pro is a one-time unlock for supported Popz Bowling Pro functionality, not a promise that third-party online services will operate forever without interruption. [OWNER/LEGAL: define what “Lifetime” means if the app is permanently discontinued and whether future major versions are included.]

## Draft refund policy - owner decision approved November 15, 2026

**Popz Bowling Lifetime Pro - Final Sale / Billing Errors**

All $9.99 one-time Popz Bowling Lifetime Pro purchases are **final**. We do not offer refunds for change of mind, non-use, or dissatisfaction. Your 30-day free trial runs **before** any optional purchase; it does not create a 30-day post-purchase money-back guarantee.

If there is a **billing error** - such as a duplicate charge, incorrect charge, unauthorized charge, or a completed payment not correctly granting the purchased Pro access - contact **feedback@popzbowling.com**. Provide the purchase date and Stripe receipt or transaction reference. Do not provide your full card number, CVV, or passwords. We will investigate and correct verified billing problems, including a refund when appropriate. Nothing in this policy limits rights or remedies required by applicable law.

An approved or legally required refund will be returned through the original Stripe payment channel. The bank or card issuer controls when the refund appears. Stripe refund, dispute, or duplicate-charge notifications are reviewed individually; they do not automatically revoke Pro or erase bowling history. Any entitlement treatment following an actual refund requires an authorized business decision consistent with applicable law.

**Owner-approved policy:** docs/REFUND-POLICY-OWNER-APPROVED-2026-11-15.md. **Still pending:** independent legal review, a publishable public policy URL, delivery-tested support mailbox, and final response-time commitment before taking live payments.

## Draft Terms of Use — product and billing sections

**Service and features.** Popz Bowling is a bowling statistics and scoring tool. Free features include local scoring and locally saved bowling history. Pro features currently include advanced shot tracking, Google cloud synchronization, multi-bowler scoring, and opt-in live-score sharing; the current app's feature list takes precedence for future versions only after clear notice to customers. Features may require internet access or compatible device/browser support.

**Access and accounts.** Paid Lifetime Pro is attached to the verified Google/Firebase account used at purchase. The customer is responsible for access to that Google account and for maintaining their own backups of important scoring records. We may not be able to restore anonymous local-only data after browser storage is deleted. Cloud features depend on the availability of third-party infrastructure.

**Trial and payment.** A new install under the commercial release gets a 30-day Pro trial with no automatic charge. Customers may choose the one-time $9.99 Lifetime Pro unlock through Stripe Checkout. No subscription or recurring billing applies. Taxes, if required, will be disclosed at Checkout according to the configured seller registrations and approved tax policy.

**Founder accounts.** Three previously approved beta users hold complimentary Lifetime Founder Pro and do not need to buy Pro. New users are not automatically eligible for Founder status.

**Customer data.** Scoring and bowling history must not be automatically deleted because a trial ends or payment changes. Access to Pro-only online sync may end after trial expiration until Lifetime Pro is purchased; local Free scoring and backups remain available.

**Refunds.** Lifetime Pro purchases are final; voluntary refunds are not offered after correct billing. Verified billing errors are investigated and corrected, including refunding an erroneous charge when appropriate. Mandatory consumer rights remain applicable. [LEGAL REVIEW REQUIRED: termination of access following a refund, chargeback/dispute response, mandatory warranties, liability, cancellation, account/data deletion, governing law, and service discontinuation terms].

**Business identification and support.** Seller: [LEGAL ENTITY NAME, BUSINESS ADDRESS OR LEGALLY REQUIRED DISCLOSURE]; contact: feedback@popzbowling.com; effective date: [PUBLICATION DATE].

## Draft Privacy Policy — data mapping checklist and wording

The app needs a transparent Privacy Policy describing precisely what data is collected and processed. The following is a working disclosure map; the final notice must be reconciled with code and service-provider agreements.

**Information and uses to disclose:**

- Bowling scores, frames, leagues, ball setups, session dates and aggregated statistics are stored locally on a user's device, and may be synchronized to Firebase when signed in and Google Sync is available.
- Google/Firebase authentication may provide a user ID, email address and provider account information to authenticate and restore purchased access across devices.
- Stripe hosts Checkout, processes payment details, and provides purchase/session/payment references and billing state to the backend. Popz Bowling should not receive full card numbers or CVV values.
- Cloudflare hosts the app and may process network/technical logs. The app has technical/runtime telemetry. Verify precise IP/cookie/device identifiers and retention before describing them.
- A user may choose to share a live-score link. The final policy must describe what selected scores become visible, who can access a link, its duration/expiration, and how sharing can be disabled.
- Local backups/export files are controlled by the user after saving them outside the app.
- Billing review/incident data is accessible to authorized operators, including Stripe payment references and internal Firestore user IDs. A scoped Telegram incident monitor sends only issue type/status, amount and review ID—not a customer email or card details.

**Required privacy decisions BEFORE publication:**

1. Actual legal seller/operator name and business address or required business contact. Contact email is feedback@popzbowling.com, matching the existing in-app Email Feedback feature; verify that the mailbox receives customer mail.
2. Confirm cloud retention, automatic deletion policy, and how a user can request full Google-account-linked data deletion/export and opt out of telemetry where applicable.
3. Verify all third-party processors and privacy links: Google/Firebase, Stripe, Cloudflare, Telegram incident monitoring, hosting/proxy infrastructure, and other configured analytics.
4. Confirm local browser storage, cookies, service worker caching, crash/telemetry logs, and cross-device behavior.
5. Determine child-user eligibility/minimum age and applicable parental consent obligations before inviting minors.
6. Verify international availability, data transfers, customer-rights request workflow, and jurisdictions targeted. Avoid falsely promising a universal retention period.
7. Agree Privacy Policy effective date and consumer notification process for material changes.

**Status:** Unapproved draft. Do not publish while any bracketed item or required privacy fact is unresolved.
