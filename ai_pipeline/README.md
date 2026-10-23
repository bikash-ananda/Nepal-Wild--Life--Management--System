# Local wildlife AI pipeline core

This package contains the model-independent decision logic for a future monkey
candidate pipeline. It does not download model weights, change the deployed API,
or mark an observation as verified. The current application continues using its
private SPARROW general-animal detector and researcher review workflow.

## Why this package exists

The existing detector can report `animal`, `person`, and `vehicle`; it cannot
identify a monkey. `wildlife_ai.consensus` defines a strict boundary for combining
three normalized model outputs:

1. A MegaDetector-compatible animal/person/vehicle gate.
2. A monkey-specific detector, which must be trained and locally validated.
3. A species classifier such as SpeciesNet.

Only spatially overlapping, high-scoring monkey predictions from both
species-capable models, corroborated by an animal box and not contradicted by a
person/dog result, become a `consensus_candidate`. Every result still requires a
human reviewer. With no local monkey detector configured, the decision is
`needs_review`.

## Normalized input

```json
{
  "capture_id": "stable-capture-id",
  "megadetector": {
    "model_id": "MDV6-mit-yolov9-c",
    "detections": [
      {"label": "animal", "confidence": 0.93, "bbox": [0.1, 0.2, 0.7, 0.8]}
    ]
  },
  "monkey_detector": {
    "model_id": "pokhara-monkey-detector-v1",
    "detections": [
      {"label": "rhesus macaque", "confidence": 0.91, "bbox": [0.12, 0.22, 0.69, 0.79]}
    ]
  },
  "species_classifier": {
    "model_id": "speciesnet-version-recorded-here",
    "detections": [
      {"label": "rhesus macaque", "confidence": 0.87, "bbox": [0.11, 0.21, 0.68, 0.8]}
    ]
  }
}
```

Boxes use normalized `[x_min, y_min, x_max, y_max]` coordinates. The adapters
that call real inference services must preserve each model/version and map its
output to this format. Do not infer that an unavailable model voted negative.
`wildlife_ai.sparrow_adapter` maps the existing SPARROW response format, and
`wildlife_ai.speciesnet_adapter` maps official SpeciesNet batch JSON, including
its processed class, score, and xywh boxes. A monkey-specific detector provider
still needs to be trained/configured; the package intentionally supplies no
pretend or random model output.

## Use the consensus evaluator

From the repository root with Python 3.10 or newer:

```powershell
python -m ai_pipeline.cli path\to\normalized-predictions.json
```

It prints a JSON decision for offline review and integration work. The evaluator
uses only the Python standard library. It does not start a web service or contact
an external provider.

Thresholds are configuration defaults, not validated probabilities. Calibrate
them using a holdout split grouped by farm/camera/encounter before considering
any change to public alerts or field operations.

## Individual re-identification

`wildlife_ai.reidentification` provides cosine matching for embeddings produced by
an explicitly configured wildlife embedding model. It returns one of:

- `matched_candidate`: top similarity and top-vs-second margin pass thresholds;
- `ambiguous`: a plausible match exists but the margin is too small;
- `new_individual_candidate`: no stored candidate is sufficiently similar.

It deliberately does not create or confirm a monkey identity. A database-backed
repository must allocate IDs transactionally, retain model/version provenance,
and route new/ambiguous matches to a human reviewer. Do not use human ArcFace
face-recognition weights as a macaque identity model. Wildlife body-pattern or
re-identification embeddings also need local validation before being used for
individual tracking.

## Dependencies and model artifacts

No paid API, GPU library, or Python package is needed for the decision logic.
Inference itself needs model runtimes and model files, which are deliberately
not copied into this repository. Add adapters only after checking the exact
software, weight, and dataset licenses and recording the model card.

The current free/low-cost direction is:

- Keep the existing private SPARROW/MegaDetector path as a coarse animal gate.
- Evaluate Google SpeciesNet as a pretrained species-classification candidate.
- Train a small monkey-specific detector only from reviewed, consented local
  images and an appropriately licensed public dataset. The standard COCO YOLO
  classes do not include monkey.
- Start individual matching as a research-only candidate using a wildlife
  embedding model, not face recognition.

REA is useful for examining software and artifacts; it does not provide YOLO
weights, wildlife datasets, or a monkey detector. DeepSeek Harness is a separate
developer-agent runtime and is in developer preview; it is not an inference
engine. The Python `Provider` protocols in this package are the narrower plugin
seam needed for detector/classifier/embedding adapters. If Harness is used by
developers, keep its tools read-only and outside the live image-decision path.

## Current integration boundary

This is a local research module only. It is not wired into `server/`, the web
frontend, the AI container, or VPS deployment. That preserves the current human
review flow and avoids deploying an unvalidated monkey classifier. Integration
should follow only after local model availability, holdout results, reviewer
approval, and resource measurements are documented.
