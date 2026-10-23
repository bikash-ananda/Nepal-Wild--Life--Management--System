# Wildlife image analysis and learning plan

## What is implemented

- The optional `wildlife-ai` container runs privately on the Compose `backend` network. It has no published host port.
- The Fastify API can report engine status and pass an authorized JPEG, PNG, or WebP image to the configured detector.
- Each analysis creates a pending `WildlifeObservation` and `VerificationSample`, including model ID, raw boxes, scores, processing time, site, and media reference. Images with no returned boxes also enter review so a missed animal can be labeled. A site push alert can happen only after a reviewer confirms a monkey label and push delivery is configured.
- Human Verification records the selected label and normalized boxes in `DatasetRecord`. This stores corrections for curation; it does not start training or deploy a model.
- The current `MDV6-mit-yolov9-c` baseline detects general animals, people, and vehicles. It is not a monkey species classifier. A high detector score must never be presented as a monkey probability.

## Enable the optional inference service

The service is disabled by default. Model files are large and are deliberately excluded from Git.

1. On the VPS, provision a compatible model package with its original license and attribution. See the [SPARROW Engine model zoo](https://github.com/microsoft/SPARROW-Engine/blob/main/docs/model-zoo-catalogue.md) for model IDs and terms; place the extracted `MDV6-mit-yolov9-c` package beneath a directory with that model ID.
2. Place the extracted model package under the path configured by `WILDLIFE_AI_MODEL_DIR` (default `./data/ai-models`). It should be visible inside the container as `/models/MDV6-mit-yolov9-c/`.
3. Set `WILDLIFE_AI_ENABLED=true` in the VPS `.env`. Keep `WILDLIFE_AI_DETECTOR_MODEL` consistent with the directory and model catalog ID.
4. Start the application with the optional profile: `docker compose --profile ai up -d --build`.
5. Sign in as a researcher and open AI Model Registry. The page reports whether the service and configured model are available.

The service uses CPU inference because the current Contabo VPS has no confirmed NVIDIA GPU runtime. Image analysis is a manual research action in this phase. Camera stream sampling, queues, and continuous detection should be added after measuring CPU, memory, and image volume on the server.

## Model choice and local validation

Start with a general animal detector as a candidate-frame filter. Do not use a geography-mismatched classifier as evidence that an animal is a monkey. The earlier catalog reference to `terai-nepal` must be checked against the currently published catalog, model artifact, class list, and license before use; Pokhara's mid-hill farm cameras also require local validation.

Collect local day, night, rain, distance, occlusion, crop, human, livestock, and empty-scene examples. Ask field researchers to confirm the target monkey species and draw boxes. Split the evaluation set by camera and encounter, not by adjacent video frame. Report per-species recall, precision, false alerts per camera-hour, and results by light and weather. Preserve a human-reviewed holdout set and compare every new model against it before activation.

## Learning methods

- **Self-supervised learning:** use image embeddings to group near-duplicates, find unusual camera conditions, and prioritize diverse unlabeled images for review. Embeddings do not supply correct species labels.
- **Human feedback:** reviewers correct detections and draw boxes. These are supervised labels. Use disagreement or low-quality images to request a second reviewer; don't convert majority votes automatically into ground truth.
- **Active learning:** after the baseline is evaluated, rank uncertain and visually novel images for review. Keep easy negatives and random samples too, so the dataset does not become biased toward hard cases.
- **Distillation:** after a validated teacher is available, train a smaller student detector on approved local labels and teacher outputs, then compare it to the same human-labeled holdout. Never let pseudo-labels overwrite human corrections.
- **RLHF:** use preference feedback to improve alert wording, timing, and operator workload after measuring those outcomes. It is not the right training signal for bounding boxes or species identity.
- **SLM and RAG:** retrieve approved field protocols and verified observations to draft short explanations or summaries. Keep retrieved source links and require a human to approve messages; the language model must not make the live animal decision.

## Related repositories

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) is a plugin-oriented AI/developer harness. Its modular design can inspire a future registry of detector, embedding, and notification adapters; it does not provide a wildlife detector or pretrained wildlife weights.
- [REA](https://github.com/morluto/rea) is a reverse-engineering toolkit. It may help inspect software artifacts during development, but it is not a production inference service or training dataset and should not be installed in the live detection path.
- [SPARROW Engine](https://github.com/microsoft/SPARROW-Engine) supplies a model-agnostic ONNX inference server and model catalog. Its API documentation describes the private `/v1/detect` endpoint used by this integration. Review the license and attribution for both engine and model artifacts before use.

## Current boundary

The app does not yet train, evaluate, register, or deploy a monkey-specific model. It does not automatically monitor a camera stream. AI results remain review-only, and the research pilot does not activate physical deterrents.

The local, model-independent consensus and re-identification prototype is in [`ai_pipeline/`](../ai_pipeline/README.md). It is not wired into this service and cannot identify monkeys without separately configured, validated model providers. See the [zero-cost pipeline plan](AI_PIPELINE_ZERO_COST.md) for model choices and integration gates.
