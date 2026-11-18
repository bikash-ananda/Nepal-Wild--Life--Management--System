import test from "node:test";
import assert from "node:assert/strict";
import { officialResearchSources, preventionMethods, researchReviewedOn, researchStudies, technologyStatusLabels } from "./researchKnowledge.js";

test("research studies have bilingual summaries, dates, source links and limitations", () => {
  assert.ok(researchStudies.length >= 8);
  for (const study of researchStudies) {
    assert.ok(study.id && study.year >= 2000 && study.year <= 2026);
    assert.ok(study.title.np && study.title.en);
    assert.ok(study.summary.np && study.summary.en);
    assert.ok(study.limitations.np && study.limitations.en);
    assert.match(study.url, /^https:\/\//);
    assert.ok(study.citation);
  }
});

test("prevention methods disclose evidence status and safety limitations", () => {
  assert.ok(preventionMethods.length >= 5);
  for (const method of preventionMethods) {
    assert.ok(technologyStatusLabels[method.status]);
    assert.ok(method.title.np && method.title.en);
    assert.ok(method.description.np && method.description.en);
    assert.ok(method.caution.np && method.caution.en);
  }
});

test("official research sources use secure links and review date is present", () => {
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(researchReviewedOn));
  assert.ok(officialResearchSources.length >= 3);
  for (const source of officialResearchSources) assert.match(source.url, /^https:\/\//);
});

test("the DNPWC national conflict profiling report is dated 2017", () => {
  const report = researchStudies.find((study) => study.id === "dnpwc-national-profile");
  assert.equal(report.year, 2017);
});
