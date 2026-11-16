import assert from "node:assert/strict";
import test from "node:test";
import { getInitialLanguage, normalizeLanguage, translate, translateWithFallback } from "./language.js";
import { languages, translations } from "./translations.js";

test("language selection normalizes supported browser and stored locale tags", () => {
  assert.equal(normalizeLanguage("ne-NP"), "ne");
  assert.equal(normalizeLanguage("EN-us"), "en");
  assert.equal(normalizeLanguage("fr"), "en");
});

test("saved language takes precedence and storage failures fall back safely", () => {
  assert.equal(getInitialLanguage({ getItem: () => "ne" }, "en-US"), "ne");
  assert.equal(getInitialLanguage({ getItem: () => null }, "ne-NP"), "ne");
  assert.equal(getInitialLanguage({ getItem: () => { throw new Error("blocked"); } }, "en-US"), "en");
});

test("translation lookup uses Nepali, then English fallback, then the key", () => {
  assert.equal(translate("ne", "incidents.new"), "घटना दर्ता गर्नुहोस्");
  assert.equal(translate("ne", "species.title"), "प्रजाति विवरण");
  assert.match(translate("ne", "notifications.costDisclosure"), /डेटा शुल्क/);
  assert.equal(translate("en", "location.accuracy", { accuracy: 35 }), "Location captured (±35 m). Check the coordinates before submitting.");
  assert.equal(translate("ne", "missing.key"), "missing.key");
});

test("every advertised language has a non-empty catalog", () => {
  for (const { code } of languages) {
    assert.ok(translations[code]);
    assert.ok(Object.keys(translations[code]).length > 0);
  }
});

test("translated navigation labels use Nepali and preserve English for untranslated items", () => {
  assert.equal(translateWithFallback("ne", "nav.item.Incidents", "Incidents"), "घटनाहरू");
  assert.equal(translateWithFallback("ne", "nav.item.Device Setup", "Device Setup"), "Device Setup");
});

test("incident and conflict form options are translated in both supported languages", () => {
  const incidentTypes = ["poaching", "wildlife_killing", "injured_wildlife", "dead_wildlife", "illegal_hunting", "illegal_trapping", "illegal_trade", "habitat_destruction", "forest_fire", "encroachment", "wildlife_conflict", "wildlife_rescue", "dangerous_wildlife", "ranger_emergency", "other"];
  const conflictTypes = ["crop_damage", "livestock_attack", "human_injury", "human_death", "property_damage", "wildlife_settlement", "wildlife_agriculture", "other"];
  for (const language of ["en", "ne"]) {
    for (const type of incidentTypes) assert.ok(translations[language][`incidentType.${type}`]);
    for (const type of conflictTypes) assert.ok(translations[language][`conflictType.${type}`]);
    for (const key of ["common.assignedSiteOptional", "common.siteAlertHint", "common.evidencePhotos", "photos.add", "photos.remove"]) assert.ok(translations[language][key]);
  }
});
