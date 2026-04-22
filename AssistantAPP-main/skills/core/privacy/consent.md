---
id: core.privacy.consent
owner: founding-engineer
jurisdiction: [PT, AE, GLOBAL]
service_lines: ["*"]
audience: [lawyer, staff, client]
tone: legal-formal
confidence: draft
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 90
supersedes: []
superseded_by: null
privileged: false
---

# Channel consent & GDPR / PDPL boundaries

**Review blocker:** DPO sign-off required (Sprint 16 pre-req) before
`confidence` promotion.

## Channels requiring explicit consent

Per GR#5 (event bus fan-out), consent is checked at the channel
agent *before* dispatch. Checks live on `Case.clientConsent.<channel>`
(boolean, per-channel, additive field on `Case`):

- `email` — implied by intake form submission; unsubscribe respected.
  Unsubscribe writes `clientConsent.email = false` + `AuditLog`.
- `sms` — explicit opt-in required at intake or via portal toggle.
- `whatsapp` — explicit opt-in at intake (WhatsApp's Business Policy
  also requires the client to have messaged us first within the
  24-hour session).
- `voice` — explicit opt-in + recording disclosure on every outbound
  call's TwiML.
- `push` (Firebase) — explicit opt-in when the client installs the
  mobile app; iOS/Android OS handle the first grant.
- `recording` — separate flag; controls whether voice calls and
  Twilio transcripts are retained beyond the session (see
  `core/privacy/retention.md`).

Each flag defaults to **false**. A `true` flag must be accompanied
by a capture-time audit row:

```ts
await logAuditEvent(caseId, userId, 'consent.granted', {
  channel: 'whatsapp',
  mechanism: 'intake_step_3_checkbox',
  grantedAt: new Date().toISOString(),
  locale: 'ar',          // client saw the AR copy
  ipHash: hashedIp,      // not raw IP (C-019 PII scrubber)
})
```

Revocation flips the flag + writes `consent.revoked`.

## Quiet hours (D-014)

Platform default: **21:00 – 08:00 client-local** for non-pager
channels. Per-actor windows on `ServiceProvider.availabilityWindows`
and `TeamMember.availabilitySchedule` override. Pager-tier (D-013
Critical) ignores quiet hours; all other tiers queue to the next
allowed window.

## GDPR lawful basis (Portugal)

| Data class | Lawful basis | Retention anchor |
|---|---|---|
| Contact details | Contract (Art. 6(1)(b)) | Engagement term + 10 years (OA record retention) |
| Passport / ID copy | Legitimate interest + legal obligation | Engagement term + 10 years |
| Criminal-history disclosure | Explicit consent (Art. 9) | Strictly necessary; purged on case close unless litigation |
| Marketing lead data (no engagement) | Consent (Art. 6(1)(a)) | 12 months; `MarketingLead` sweep |
| DSAR inbox | Legal obligation | 3 years after DSAR closure |

## UAE PDPL posture (v1.x)

PDPL applies when any processing occurs on UAE residents' data.
Notable differences:
- No EU adequacy → separate DPA between LVJ (UAE tenant) and
  UK/EU providers.
- DIFC / ADGM companies may have a stricter regime; check tenant
  contract.
- Same consent primitives apply; labels in notification templates
  must reference "UAE Personal Data Protection Law" (not GDPR) when
  the destination jurisdiction is AE.

## Scripted consent prompts

**Email (automatic at intake, pre-checked disallowed):**

> EN: *"May we email you case updates? You can unsubscribe any time."*
> AR: *"هل يمكننا إرسال تحديثات القضية إليك عبر البريد الإلكتروني؟ يمكنك إلغاء الاشتراك في أي وقت."*

**WhatsApp (opt-in at step 3 of intake):**

> EN: *"We can send you status updates on WhatsApp when your case
> moves. WhatsApp's policy lets us message you within 24 hours after
> you message us."*
> AR: *"يمكننا إرسال تحديثات حالة القضية عبر واتساب عند تقدّم قضيتك. تسمح لنا سياسة واتساب بالمراسلة لمدة 24 ساعة بعد أن تراسلنا."*

**Voice (TwiML preamble on every outbound call):**

> EN: *"This call may be recorded for case quality and legal
> compliance. Press 1 to continue, or say 'no recording' to end the
> call without recording."*
> AR: *"قد تُسجَّل هذه المكالمة لضمان الجودة والامتثال القانوني. اضغط 1 للمتابعة أو قُل «لا تسجيل» لإنهاء المكالمة دون تسجيل."*

The AR variants in this file are draft copy per D-015 — the native
AR reviewer gate applies before `confidence: authoritative`.
