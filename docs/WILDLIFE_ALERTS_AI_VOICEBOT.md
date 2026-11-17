# WAMS location-aware wildlife alerts and AI voice bot

**Status:** Architecture preparation only. No messaging or calling provider is connected and no alerts are sent by this document.

## 1. Product goal

Let a farmer or livestock owner voluntarily register a farm/location and choose the wildlife risks and channels for which they want advance warnings. When a credible wildlife event is detected or confirmed near that registered area, WAMS matches the event against subscribed locations and sends a timely, localized warning.

The service must support Nepali first and English, with SMS/email/push as additional fallback channels where configured.

## 2. Important distinction: location is the farm, not continuous phone tracking

- The user selects a farm point on a map or grants one-time GPS permission to save the farm location.
- WAMS stores the farm geolocation and an accuracy/source label. The user's phone is not continuously tracked in the background.
- A user may register more than one farm/plot and set a separate alert radius and risk preferences for each.
- The event location is compared with saved farm locations using geospatial distance and species/event-specific thresholds.
- Exact farm coordinates are private and must never appear in community-facing alerts.

## 3. Existing repository findings

- The public landing page already has a notification-preference form for name, phone, email, province, district, municipality, ward, channels, wildlife risks and one-time location consent.
- At present, those public-page preferences are saved in browser localStorage; they are not a durable server-side subscription that can drive alerts to a different device.
- The API already has browser push subscription routes and an in-app/public notice capability.
- The current pilot plan explicitly records that the AutomationRule executor is not implemented and that SMS/WhatsApp require a real provider with delivery receipts.
- Therefore the new work must add server-side alert subscriptions, an event-to-location matcher, an outbox/worker, provider adapters and auditable delivery status. Do not present the existing preference form as an operational warning service until that path is implemented and tested.

## 4. Target architecture

```
Camera / farmer photo / ranger report / verified observation
                         |
                Wildlife event intake
                         |
          AI-assisted species/activity assessment
                         |
        confidence + source + time + location checks
                         |
           risk rules and human-review gate
                         |
            geospatial subscriber matching
                         |
              Alert Outbox (PostgreSQL)
                         |
            rate-limited delivery worker
          /              |                \
 WhatsApp template   Voice-call provider   SMS / email / push
          \              |                /
             Delivery webhooks + audit log
                         |
             Farmer delivery preferences
```

### Backend modules

1. **AlertSubscription service:** server-side profile, verified phone/email, farm points, selected species/risks, preferred language, quiet hours, radius, channel preferences, consent timestamps and opt-out state.
2. **WildlifeEvent service:** normalized event with species (confirmed/estimated/unknown), behavior, event time, coordinates, accuracy, evidence source, confidence, verification status and expiry.
3. **Risk matcher:** PostGIS/geospatial query (or a tested Haversine implementation for the pilot) matches active events to farm points. It considers distance, species, behavior, direction/trend if actually available, event age and duplicate suppression.
4. **Risk policy:** species-specific thresholds and message severity. A single AI image label is not sufficient to claim a dangerous animal is approaching. Unverified AI output must be worded as a possible sighting and may require ranger/reviewer confirmation.
5. **Alert outbox:** durable queued jobs, idempotency key, retries with backoff, per-recipient cooldown, quiet hours, escalation rules and provider delivery receipts.
6. **Provider adapters:** WhatsApp Cloud API; WhatsApp Business Calling where Meta enables it for the registered sender and recipient permission exists; PSTN voice provider for ordinary mobile calls; optional SMS/email/push fallback.
7. **Voice agent:** for phase 1, use a clear pre-generated Nepali/English spoken alert plus keypad confirmation (e.g. press 1 to acknowledge, press 2 to request a human callback). Phase 2 can add a bounded interactive voice agent with speech recognition and text-to-speech. It must identify itself as an AI assistant, never claim certainty beyond event evidence, and provide a human escalation path.
8. **Admin console:** provider connection status, templates, test recipient, campaign preview, delivery log, opt-out suppression, call outcomes, usage/cost limits and emergency kill switch.

## 5. WhatsApp sender: proposed number 9768004157

Treat this as the proposed WAMS WhatsApp Business sender, not as a number that is already connected.

Required onboarding:
1. Confirm that WAMS controls the SIM and can receive Meta's SMS/voice verification code.
2. Create or select the correct Meta Business Portfolio and WhatsApp Business Account (WABA).
3. Set up a Meta developer app and WhatsApp Cloud API; configure the business display name and profile.
4. Verify the business where Meta requires it; configure a system-user token with minimum permissions and secure token rotation.
5. Register the sender and enable two-step verification; store tokens and PIN only in the VPS secret store, never in GitHub or frontend code.
6. Configure and verify the webhook URL and webhook secret/signature validation.
7. Submit Nepali and English utility templates for review (wildlife safety alerts, acknowledgements, opt-out/help).
8. Test inbound replies, delivery/read/failure webhooks, rate limits and quality status before enabling live traffic.

**Important number choice:** Direct Cloud API registration may change how the number is used in the regular WhatsApp app. If the team must continue using the WhatsApp Business mobile app on this same number, first check Meta's supported Business App Coexistence onboarding eligibility. Do not deregister or migrate the number until the owner explicitly chooses the onboarding path.

WhatsApp business-initiated messages require an appropriate user opt-in and approved templates outside the customer-service window. WhatsApp business-initiated voice calls require separate calling permission and sender eligibility. A WhatsApp call rings inside WhatsApp; it is not the same as a normal carrier phone call.

## 6. Ordinary phone calls (PSTN)

For calls that ring as normal mobile-network calls:
- Use a programmable voice API or a Nepal telecom/IVR provider that confirms API access, caller-ID authorization, Nepal mobile termination, retry policy, concurrency and delivery callbacks in writing.
- Do not spoof caller ID. Use only a number/provider route explicitly authorized for this use.
- Twilio publishes Nepal mobile outbound pricing, but a Nepal-owned caller ID must be verified and the account's Nepal dialing permissions and regulatory restrictions must be confirmed before relying on it.
- Nepal Telecom advertises an outbound IVR service for pre-recorded messages. Confirm whether it offers an API/automated event trigger and whether its service supports dynamic per-recipient messages; do not assume it is a conversational AI calling API.
- Compare local providers (including E-PRIMA) and international voice APIs using a controlled test call before selection.

## 7. Consent and privacy

The subscription form must collect separate, unchecked-by-default choices:
- WhatsApp wildlife alert messages
- WhatsApp voice calls (if enabled)
- Ordinary mobile-network phone calls
- SMS
- Email
- Browser push

Record the exact consent text/version, timestamp, source, phone verification status, channel, and withdrawal time. A phone number alone or a saved farm pin is not consent to call. Provide STOP/UNSUBSCRIBE and profile controls. Honor channel-specific opt-outs immediately.

Collect only the data needed for warning delivery. Do not expose exact farm coordinates to other users. Define retention, access roles, export and deletion controls before launch.

## 8. Alert message design

Every alert should contain:
- WAMS identity and language;
- event type/species with confidence wording (confirmed / reported / possible);
- approximate locality, not another farmer's exact coordinates;
- event time and freshness;
- practical, nonviolent safety steps;
- a clear “do not approach, chase, feed or corner the animal” instruction;
- acknowledgement/help link or callback path;
- alert expiry or “new update” context.

Never guarantee that an animal will attack or that a warning prevents damage. Do not automatically activate electric fences, sirens or other physical deterrents from an AI alert. Those remain independently controlled, safety-reviewed and audited.

## 9. Suggested phased delivery

### Phase A — Provider and consent readiness
- Verify sender-number ownership and Meta onboarding route.
- Choose PSTN provider after Nepal mobile test and written confirmation.
- Design channel-specific opt-in, opt-out and message templates.
- Add server-side subscription and farm-location data model.

### Phase B — Reliable messaging alerts
- Add wildlife event normalization, geospatial matching and outbox.
- Implement WhatsApp template sending and delivery webhooks.
- Add admin test mode, recipient allowlist, cooldowns and daily spend cap.
- Pilot with a few consenting Ward 21 participants; initially require human approval.

### Phase C — Voice calling
- Add ordinary PSTN voice alert using pre-generated Nepali/English audio and DTMF acknowledgement.
- Add retry rules, voicemail handling, quiet hours, call logs and human escalation.
- Add WhatsApp Business Calling only if sender and recipient permissions/eligibility are verified.

### Phase D — Bounded conversational AI
- Add speech recognition + multilingual TTS/voice agent for follow-up questions.
- Limit the agent to the event evidence and approved safety guidance.
- Provide a human transfer path and log the call outcome; recordings only with explicit consent and retention policy.

### Phase E — Controlled expansion
- Add multi-location subscribers, species-specific risk tuning, local authority escalation and delivery analytics.
- Expand beyond Ward 21 only after field precision, alert usefulness, opt-out rate and delivery reliability are measured.

## 10. Required acceptance tests

- No message or call is sent without the matching channel consent.
- A user can opt out of one channel without losing other selected channels.
- Duplicate events do not cause repeated calls/messages.
- Expired, stale or low-confidence sightings do not trigger an urgent threat message.
- A report near one farm does not expose another farm's precise location.
- Delivery failures are retried safely and visible to administrators.
- Quiet hours, rate limits, emergency stop and per-user cooldowns work.
- Nepali Unicode and audio are intelligible on common Android devices.
- Test mode cannot accidentally reach real recipients.
- Provider outage does not block report submission or other WAMS functions.

## 11. Configuration placeholders (secrets must remain outside Git)

- `WHATSAPP_CLOUD_API_VERSION`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `VOICE_PROVIDER`
- `VOICE_PROVIDER_ACCOUNT_ID`
- `VOICE_PROVIDER_AUTH_TOKEN`
- `VOICE_FROM_NUMBER`
- `ALERT_DELIVERY_ENABLED=false` (safe default)
- `ALERT_TEST_MODE=true` (safe default)
- `ALERT_ALLOWED_RECIPIENTS`

Never commit real tokens, verification PINs, phone-owner documents or recipient lists.

## 12. External references

- Meta WhatsApp Business Policy: https://whatsappbusiness.com/policy/
- Meta WhatsApp Cloud API collection: https://www.postman.com/meta/whatsapp-business-platform/
- Twilio WhatsApp Business Calling: https://www.twilio.com/docs/voice/whatsapp-business-calling
- Twilio Nepal voice pricing: https://www.twilio.com/en-us/voice/pricing/np
- Nepal Telecom Outbound IVR: https://www.ntc.net.np/services/outbound-ivr
- E-PRIMA IVR: https://eprima.com.np/ivr/
