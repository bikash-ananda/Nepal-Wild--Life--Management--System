# Pokhara Ward 21 Research and AI Plan

**Status:** Research and implementation guidance. This document does not mean that an AI agent, SLM, RAG service, model-training worker, or automated response worker is running.

## Project context

The shared project report proposes a staged Nepal human–wildlife conflict research programme: establish a baseline, build the information system, run a pilot, evaluate and improve it, then consider wider use. It emphasizes scientific validation, human review, data provenance, model versioning, privacy, and evaluation. This plan applies those principles to the current Pokhara Metropolitan City Ward 21 human–monkey crop-conflict prototype.

The project report contains personal and institutional details. This repository captures the research conclusions and technical direction, not the full report, names, or budget.

## What previous research says

| Evidence | What it can tell us | Important limit |
| --- | --- | --- |
| Sharma & Acharya, *Human-Rhesus macaque conflict at Pumdivumdi/Tallokodi, Pokhara, West Nepal*, *Banko Janakari* 27(2), 2017. A purposive survey of 60 households described crop-raiding, reported maize and potato among commonly affected crops, and recorded local responses. [Article](https://doi.org/10.3126/banko.v27i2.21222) | Pokhara has local historical research that can inform the Ward 21 questionnaire and variables. | The field survey was in 2016 in Pumdivumdi/Tallokodi, then Ward 25. Its sample and historical percentages are not estimates for Ward 21 today. |
| Koirala et al., *Factors affecting the crop raiding behavior of wild rhesus macaques in Nepal*, *Journal of Environmental Management* 297 (2021). Observations covered 52 macaques and 172 plots in Kavrepalanchok from August to October 2019. Crop type, proximity to forest edge and macaque routes, and farmer mitigation were relevant factors. [PubMed](https://pubmed.ncbi.nlm.nih.gov/34298347/) | Suggests useful variables to collect and test in a farm–forest setting. | Kavrepalanchok results and its estimated losses must not be copied as Pokhara measurements or causal effects. |
| Kandel et al., *Identifying the environmental and anthropogenic causes, distribution, and intensity of human rhesus macaque conflict in Nepal*, *Journal of Environmental Management* 316 (2022). [PubMed](https://pubmed.ncbi.nlm.nih.gov/35576709/) | Provides a national-scale landscape and human-pressure context for formulating local GIS questions. | National suitability or conflict maps do not verify an individual sighting or replace field validation. |

### Working conclusions for Ward 21

- Treat earlier studies as context and hypotheses, not local ground truth.
- Record crop and crop stage, event date and time, approximate group size only when a reviewer can judge it, measured or clearly estimated damage, and what response was tried.
- With consent and restricted access, retain coordinates and GPS accuracy separately from public summaries. Derive distance to a forest edge or known route only where a reviewed GIS layer exists.
- Use consistent incident definitions and denominators. For example, report loss per surveyed plot or crop area rather than comparing raw totals from unequal farms.
- Record who supplied each value, when it was captured, whether it was estimated, and the reviewer and evidence status. Never silently convert a model score into a confirmed incident.
- Do not conclude that a deterrent works from an anecdote. Compare repeated observations, duration, damage, crop stage, and exposure, and report uncertainty.

## AI and data path

### 1. Use the existing detector as a screening tool

The current inference integration accepts an image and research site and writes candidate detections for human review. Its configured pretrained model is a general animal detector, not a validated monkey-species classifier. Keep its output as an unverified candidate; no public warning, species claim, or equipment action should follow from that score alone.

### 2. Build an auditable local dataset

Use the existing capture, observation, verification, media, and dataset records. Keep a stable capture/idempotency identifier, capture time, site, GPS accuracy, media checksum, model/version, raw detector output, reviewer decision, label, and bounding boxes. Keep demonstration records separate from research records. Mark study records as real rather than demo data. Preserve negative frames and false detections.

Split evaluation data by farm/site, camera, and encounter/session before training. Do not randomly split adjacent video frames across train and test sets: that can make scores look much better than performance on a new field or day.

### 3. Evaluate before enabling a monkey model

Use researcher-approved labels and a held-out set. Report precision and recall by species, camera, time of day, weather, distance/size, and image quality; also report false alerts per camera-hour and missed detections. Publish the sample counts and uncertainty with each result. Require a signed model card, reviewer approval, rollback version, and privacy check before any deployment.

Self-supervised image embeddings can group near-duplicates and help reviewers find diverse or uncertain examples. They are a triage aid, not species labels. Active-learning scores can prioritize human review; the reviewer remains the source of truth.

### 4. Add RAG and an SLM only for grounded text work

An approved research assistant could retrieve from reviewed papers, the project report's approved conclusions, field protocols, and de-identified, human-reviewed records. Every answer should show citations, source dates, and whether it describes prior research or local observations. Filter by the user's authorization before retrieval; do not put precise farm coordinates, reporter details, credentials, or private camera URLs into model prompts.

A small language model could summarize approved incident batches, translate reviewed safety wording, or draft a bilingual notice. Retrieval and drafts must be clearly labeled; a human must approve notices. Distillation from a larger model can teach format, concise language, and tool-use patterns, but synthetic answers are not wildlife labels or evidence. Never use a language model to confirm a camera detection.

Human preference feedback can tune notice clarity and reviewer workload. Treat species correctness as a separately verified annotation task, not as an RLHF preference.

### 5. Keep agent tools narrow and observable

DeepSeek Harness is an agent/plugin orchestration project; it is not a wildlife detector or a drop-in API for this React application. If adopted later, isolate it in an authenticated server-side worker with read-only research/search tools by default, schema-validated inputs, timeouts, per-user authorization, rate limits, and an audit record. Only explicit, reviewed application APIs should permit writes. Do not expose agent or MCP credentials to the browser.

REA is a reverse-engineering and application-analysis toolkit. It can help inspect a legacy app, binary, or runtime behavior during engineering review; it does not provide camera inference, monkey training data, or species identification.

## Human review and public alerts

1. Camera or mobile capture is stored with provenance and privacy controls.
2. The pretrained detector may suggest animal boxes.
3. A reviewer confirms, corrects, or marks a false detection and adds crop-impact context where applicable.
4. Only a separately configured, tested notification provider can deliver a public notice; record the provider result and target area. Do not tell residents a message was sent when it was only drafted.
5. Repeated local evidence may inform a reviewed notice rule after evaluation. During the research pilot, do not automatically activate sirens, lights, relays, high-voltage equipment, or other deterrents.

## Release gates

- **Baseline:** agree on definitions, consent, survey method, data minimization, access roles, and retention.
- **Prototype:** verify capture metadata, offline upload behavior, duplicate handling, private media access, audit/provenance, and accessibility.
- **Pilot:** train reviewers, monitor missed and false detections, and collect farm/site-diverse examples with consent.
- **Evaluation:** publish model and field metrics with denominators, limitations, and human-review rate; check for location and demographic bias.
- **Expansion:** require approval, a model/data card, change log, rollback, and a new site validation before adding species or municipalities.

## Engineering references

- [REA repository](https://github.com/morluto/rea)
- [DeepSeek Harness repository](https://github.com/deepseek-ai/deepseek-harness)
- [Pokhara Pumdivumdi/Tallokodi study](https://doi.org/10.3126/banko.v27i2.21222)
- [Kavrepalanchok crop-raiding study](https://pubmed.ncbi.nlm.nih.gov/34298347/)
- [Nepal-wide rhesus macaque conflict study](https://pubmed.ncbi.nlm.nih.gov/35576709/)
