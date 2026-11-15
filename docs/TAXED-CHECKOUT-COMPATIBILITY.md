# Popz Bowling — Tax-Inclusive and Tax-Extra Checkout Compatibility Gate

**OPEN RELEASE BLOCKER. NO AUTOMATIC TAX ENABLED.**

## Existing strict sandbox behavior

The one-time Popz Bowling Lifetime Pro Price is $9.99 (999 USD cents). The current, successfully sandbox-tested Checkout implementation intentionally rejects any paid Stripe session with a total other than exactly 999 cents. The reservation reuse verification also requires `amount_total === 999`, and the refund/dispute audit currently expects the original PaymentIntent and refund amount to be at most 999 cents. The isolated D1 billing-review schema likewise has a check constraint `amount_cents <= 999`. These checks protected the no-tax sandbox pilot.

**If applicable sales tax is charged on top of $9.99, these strict checks will reject a legitimate paid Checkout/PaymentIntent and could fail to record a taxed refund alert.** Do not change Stripe to automatic tax or enable live sales while this mismatch exists. Do not simply remove all amount checks: amount validation guards against wrong products, currency confusion, tampered Checkout sessions and duplicate or unrelated Stripe events.

## Owner/accountant decisions needed first

1. Verify legal seller of record and all applicable collecting jurisdictions/registrations.
2. Confirm the correct Stripe product tax code for the actual offline PWA + optional cloud sync delivery model.
3. Decide whether the customer-facing **$9.99 is tax-inclusive** or **$9.99 plus any applicable tax**. This decision affects how to configure the new live Price's tax_behavior and what totals the application must expect.
4. Confirm Stripe Tax Settings status is active, an applicable registration has status collecting, and legal notices state the tax treatment correctly. Current sandbox account has missing head office, no registrations, product tax_code=null and Price tax_behavior=unspecified; this is not a verified live setup.

## Implementation to complete after classification/price approval

- Keep the authoritative **base price** at 999 cents. Retrieve and verify the exact live Price ID, Product ID, mode, currency, one-time type, line-item quantity, session UID/nonce and paid/complete status.
- Use Stripe's returned `total_details.amount_tax`, `amount_subtotal` and `amount_total` consistently with the approved tax_behavior; prohibit unapproved discounts, shipping or additional lines. Do not trust a client-supplied amount. Verify that the PaymentIntent actually settled for the authorized total before issuing Lifetime Pro.
- Store the actual gross paid amount, tax and subtotal in the canonical Firestore billing record. Preserve the record on webhook replay and if a second purchase is attempted. Never overwrite the original purchase.
- For refunds and disputes, independently fetch Stripe's latest payment/refund/dispute. Compare their amount against the stored original **gross** paid amount, rather than only the $9.99 base amount. Partial refund and multiple refund events must remain append-only and alert-only; never silently revoke Founder, paid Pro or bowling history.
- Raise the billing-review D1 schema's current 999-cent audit cap to an explicitly reviewed safe maximum. Prepare and test a data-preserving migration, take a backup, and verify both sandbox and new production database schema and existing review counts before switching logic. The existing preview contains prior resolved audit cases and must not lose them.
- Update the VPS Telegram monitor amount validation to match the approved cap. Keep exact sandbox and production token/environment isolation, and test that delivery is retried after network errors.
- Add genuine sandbox **taxed** Checkout and refund tests using a realistic address in a registered jurisdiction. Verify the taxability_reason isn't not_collecting. Ensure the user sees the correct amount before confirming payment and the receipt shows taxes correctly. No tax rate or location should be hardcoded.
- Maintain a fail-closed behavior if Stripe reports unexpected tax totals, products, invalid statuses, currency, unauthorized account mode, or unavailable Firestore/Stripe services.
- Only after these tests and approved live registrations may the user explicitly authorize automatic tax and the live release.

## Canonical references

- https://docs.stripe.com/tax/set-up
- https://docs.stripe.com/tax/checkout
- https://docs.stripe.com/tax/digital-products
- https://docs.stripe.com/tax/tax-codes
- https://docs.stripe.com/api/checkout/sessions/object#checkout_session_object-total_details
