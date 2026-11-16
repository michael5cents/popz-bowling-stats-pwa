# Popz Bowling — Live merchant, tax, and pricing review

Status: **PRELAUNCH WORKING RECORD — NOT APPROVED FOR COLLECTION OR PUBLICATION**.
Prepared November 15, 2026. Do not enable Stripe Tax, change prices, register a jurisdiction, or collect a live payment based on this document alone.

## Verified facts

- Product decision: Popz Bowling Lifetime Pro is a single optional **$9.99 USD** purchase, with no monthly or annual subscription. Existing three Founder accounts remain free for life. New installations get a 30-day Pro trial; Free scoring and local History remain usable afterward without payment. The purchase belongs to a signed-in Google/Firebase user, not to a single tablet or phone.
- Stripe connection available to this workspace **only**: *Popz Computers & App Development sandbox*, account `acct_1UbmSbBmwB4QMGDE`, **livemode=false**. Stripe account returned charges_enabled=false, payouts_enabled=false and details_submitted=false in the sandbox. This is **not** evidence about live merchant readiness; no live account is connected.
- Sandbox product `prod_Vd6n0W8JakrQl9`, one-time price `price_1UbqZiBmwB4QMGDE6oIXNFL0`, USD 999 cents, product currently has **no tax_code**, price tax_behavior is **unspecified**. These are test objects, not live sale IDs.
- Sandbox Stripe Tax settings returned **status=pending**, **head_office=null**; the registrations API returned **zero** tax registrations. The Tax threshold monitor returned no locations and no computation timestamp. No Tax calculation/collection readiness can be inferred from these sandbox results.
- Do not toggle `automatic_tax`: Stripe Tax does not collect in a customer jurisdiction without an active registration, even if auto tax is enabled. The seller's actual nexus/registrations must first be confirmed with its accountant/tax advisor.

## Product classification — Stripe canonical candidate codes (not selected)

Codes retrieved **read-only** from Stripe's Tax Codes API November 15, 2026:
- `txcd_10103000` — *Software as a service (SaaS) – personal use*, hosted online without downloaded software.
- `txcd_10103100` — *Software as a service (SaaS) – electronic download – personal use*, hosted services with an installed local client.
- `txcd_10202000` — *Downloadable Software – personal use*, downloaded prewritten software.
- `txcd_10202001` — *Downloadable Software – non-recreational – personal use*, downloaded prewritten software used for non-recreational purposes.

**No code is yet approved or configured.** Popz Bowling is a hybrid offline PWA with optional cloud sync. The appropriate classification can differ based on whether the transaction is characterized as a downloaded software license or a hosted service; confirm the actual offering and tax advice first. A generic all-digital-services code should not be used by default.

Canonical documentation: https://docs.stripe.com/tax/tax-codes and https://docs.stripe.com/tax/digital-products.

## Relevant external tax context (NOT a determination of the seller's obligations)

Alabama Administrative Code Rule 810-6-1-.37 treats sales/licensing of software as taxable, generally regardless of how the software is transmitted, with distinctions for separately billed programming services. Official text: https://admincode.legislature.state.al.us/api/rule/810-6-1-.37.

Alabama's $250,000 remote seller threshold relates to **out-of-state sellers without Alabama physical presence**. It must not be treated as a universal safe harbor for an in-state seller. See https://www.revenue.alabama.gov/faqs/are-all-remote-sellers-required-to-register-in-alabama/ and https://www.revenue.alabama.gov/sales-use/sales-tax/.

**The owner's actual legal business address, tax registrations, business presence and customer locations are unverified. Do not infer them from a device location or IP address.** A qualified tax advisor must determine where sales tax/VAT/GST registration and collection are required. No registrations were created.

## Business decisions still needed before live Checkout

1. **Seller of record**: verify the actual legal entity, address, contact/support details and payout identity in Stripe **live mode**. Confirm live charges/payouts enabled and 2FA for owner access.
2. **Tax**: record tax registrations by state/country, agree the software product code, and whether $9.99 is tax-inclusive or **$9.99 plus applicable sales tax**. Use Stripe Tax only once settings are active and each relevant registration is collecting.
3. **One-time price**: create a new *live* $9.99 one-time Price linked to a *live* Lifetime Pro Product; never reuse sandbox IDs. Set the correct tax_behavior and product tax_code only after advisor review.
4. **Refund policy**: decide an explicit refund request period, what happens if Lifetime Pro has been used, and exceptions required by applicable consumer law. The **30-day Pro trial is not a promised 30-day money-back guarantee**.
5. **Customer details**: establish a support email and business contact address; publish readable Terms, Privacy and Refund pages before accepting payment.
6. **Security**: provision a minimal-permission **live** restricted Stripe API key through the Stripe Dashboard, live signed webhook with verified signing secret, and distinct Cloudflare production credentials. Never paste them in chat or commit them.
7. **Verification**: run live-configuration preflight and signed webhook checkout/fulfillment tests before any real charge. Any real live charge, refund, account grant or paid launch requires explicit owner approval.

## Tax validation at future activation

First read the **live** Stripe Tax settings and registrations; verify status=active and required jurisdictions=Collecting. Validate product tax code and price tax_behavior. Use a representative customer address in a confirmed registered jurisdiction and check the returned taxability_reason rather than assuming a zero amount is correct. For live-mode testing, use a non-charging tax preview where available (live calculations can incur fees). Never collect tax solely based on this document.

Stripe Tax setup: https://docs.stripe.com/tax/set-up.


## November 15, 2026 - Live Stripe prelaunch verification
Live Stripe account connected: acct_1UbqNUPWlfgsVLEI; earlier no-live-account entries above are historical.
Inactive live product prod_VdUdkV2ijsyKCv; tax code txcd_10202000 copied from onboarding, classification review pending.
Inactive live one-time price price_1UcDf2PWlfgsVLEISDJ6MZaL for USD 9.99 tax-inclusive. No Payment Link, live webhook or charge created.
Live Stripe Tax settings active, but zero tax registrations recorded. Tax obligations unresolved; no jurisdiction was assumed or registered.
Complete commercial development branch automated suite passed 88/88 after updating obsolete mock paid-session fixtures.
Production billing remains disabled; no app deployment, Founder entitlement change or bowling history mutation.
Remaining: tax registration confirmation, public policies and refund terms approval, restricted live key, signed production webhook, incident monitor, tax-inclusive integration test and production release verification.


## November 15, 2026 - Production v39.014 deployment after live-account authorization
- Owner authorized the live release and confirmed the customer-facing $9.99 total tax-inclusive one-time price.
- Stripe live product prod_VdUdkV2ijsyKCv and live price price_1UcDf2PWlfgsVLEISDJ6MZaL are now active in Stripe; a direct payment link or checkout purchase was NOT created.
- Stripe live webhook we_1UcDiXPWlfgsVLEIfBowEZdG is registered for https://popzbowling.com/api/billing/webhook and payment/refund/dispute events; Cloudflare live signing secret still needs secure installation.
- The commercial source was built and deployed directly to Cloudflare Pages production main as public-v39.014 (deployment 175dd8d3.popzbowling.pages.dev). Live https://popzbowling.com/latest-version.json confirmed version public-v39.014. Live /api/billing/config returned enabled:false and /api/billing/trial returned enabled:false; /api/billing/reviews returned 404 due to default-off gate. This is a code deployment but NOT a paid launch.
- Cloudflare production secret inventory exposes only TELEMETRY_DASHBOARD_PASSWORD. Stripe live restricted key, live webhook signing secret and production Firebase service-account credentials remain absent. They cannot be inferred/copied from the successful sandbox tests. No credential should be logged, committed or pasted in chat.
- Product is active in Stripe without an associated direct Payment Link; Popz app cannot start a charge while the server billing gate is disabled.
- Existing 3 Founder grants, cloud bowling history and Free access remain unchanged; Pro Preview remains ON until the coordinated commercial entitlement rollout.
- The tested tax-inclusive amount validation code is staged; Stripe Tax settings active but no registrations have been added, and automatic tax collection remains disabled. An accounting determination remains necessary.
