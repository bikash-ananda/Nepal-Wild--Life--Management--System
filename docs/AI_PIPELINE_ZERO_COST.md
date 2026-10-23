# No-cost AI pipeline plan

## Current project state

The live application already has a private SPARROW inference service using a
general animal detector. It stores detections as unverified review samples.
That detector distinguishes animals, people, and vehicles; it does not identify
monkeys. The training loop and continuous camera analysis are not connected.

The new [`ai_pipeline`](../ai_pipeline/README.md) folder adds offline decision
logic and plugin contracts. It does not download weights, change the deployed
service, or bypass the existing human-review workflow.

## Zero-cost model strategy

“No cost” here means no paid hosted inference APIs, subscriptions, or licenses
are required for the initial path. The work still uses local CPU, bandwidth,
storage, electricity, labeling time, and maintenance. Model software, model
weights, and datasets can have different license terms; record and check all
three before each use.

| Stage | Use | Cost and limit |
| --- | --- | --- |
| Animal gate | Keep the existing private SPARROW/MegaDetector service. It screens animal/person/vehicle and empty frames. | Existing code path; CPU load and model artifact availability still need measurement. It is not a species classifier. |
| Species candidate | Evaluate Google SpeciesNet as a free-download species classifier, preferably on crops from the detector. | No paid API, but its classifier is large and may be slow on the CPU VPS. Verify the exact weight terms and test Nepal macaques; a low or unknown result stays in review. |
| Independent vote | Train a monkey-specific detector from human-reviewed local data, only after enough diverse images are labeled. | No ready-to-use Pokhara monkey detector is included. Standard COCO YOLO labels do not include monkey. Training and holdout evaluation need local compute and expert review. |
| Individual candidate | After species confirmation, test a wildlife embedding model and cosine search over reviewer-approved profiles. | No human face-recognition weights. Do not assign a real identity from one embedding or face crop; new and ambiguous results remain provisional for review. |

The consensus core requires an overlapping high-confidence monkey prediction
from both a monkey detector and species classifier, plus an animal detector
box. A missing model is not a negative vote. The default 0.80 thresholds are
configurable starting values, not calibrated probabilities or a claim of 80%
accuracy. Select thresholds on data held out by farm, camera, and encounter;
report precision, recall, false alerts per camera-hour, and performance by
day/night, weather, range, and occlusion.

## Learning and review loop

1. Use existing capture and verification records. Keep original bytes private,
   preserve capture time/GPS accuracy/checksum/model provenance, and keep public
   uploads and camera captures in the same review queue with source recorded.
2. Let reviewers confirm/correct species, boxes, and animal counts. Preserve
   negatives, empty scenes, people, livestock, and model false positives.
3. Use self-supervised embeddings only to group near duplicates and surface
   diverse or uncertain examples. They do not create labels.
4. Once enough reviewed data exists, train a small detector. Compare with the
   old model on an untouched camera/encounter split, then get researcher signoff
   and keep a rollback model.
5. Consider teacher-to-student distillation only after the teacher is validated.
   Teacher pseudo-labels must never replace human corrections.
6. Use reviewer preference/RL feedback for alert wording and review workload,
   not to teach the vision model what a monkey is.

## Individual re-identification

The package's vector matcher implements cosine similarity and an ambiguity
margin without a vector database dependency. For a small pilot, an authorized
repository can load reviewed embedding profiles and rank them in memory. For
larger collections, evaluate PostgreSQL `pgvector` if the installed PostgreSQL
package supports it; otherwise use a local vector index with export/backup.
Record embedding model/version, crop provenance, source encounter, and reviewer
decision. A match is a candidate until reviewed. Allocate IDs transactionally in
the repository, and do not reuse IDs after correction or deletion.

## Plugin, SLM, RAG, and agent boundaries

- The `providers.py` protocols are small local plugin seams for animal detectors,
  species classifiers, and wildlife embedders. Optional packages can implement
  them without becoming dependencies of the React/Fastify application.
- REA is for reverse engineering software and runtime behavior. It does not
  contain YOLO model weights or wildlife training data; do not copy a model from
  it.
- DeepSeek Harness is a developer agent runtime with a plugin architecture and
  is currently in developer preview. It is not a wildlife inference service.
  If used locally for engineering, grant only the tools it needs and keep it
  outside the real-time image decision path.
- A local SLM and RAG can later summarize approved research and reviewed
  incidents. Use local documents and citations, remove precise farm coordinates
  and reporter details from prompts, and require human approval for notices. Do
  not call an LLM to decide species, individual identity, or actuation.
- During this research pilot, do not automate sirens, lights, relays, or other
  physical deterrents from model output.

## Deployment boundary

The current `server/`, Docker Compose, Caddy, and VPS configuration have not
been changed. Before integration, measure sustained CPU/RAM and queue delay with
real images, agree on data retention and privacy controls, and show holdout
metrics and model licenses to the research lead. Then connect adapters through
the existing authenticated AI review route. No live alerts or actuation should
be enabled from this package alone.

## Primary references

- [Google SpeciesNet](https://github.com/google/cameratrapai): model pipeline,
  pretrained classifier, CPU execution, and output format.
- [Microsoft MegaDetector camera-trap AI notes](https://github.com/microsoft/MegaDetector/blob/main/docs/camera-trap-ai.md):
  detector scope and detector-then-classifier workflow.
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): agent
  harness and developer-preview notice.
- [REA](https://github.com/morluto/rea): reverse-engineering CLI/MCP scope.
- [SPARROW Engine](https://github.com/microsoft/SPARROW-Engine): existing
  model-agnostic inference-engine context.
