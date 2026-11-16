import assert from "node:assert/strict";
import test from "node:test";
import { speciesLibrary, speciesReferenceSources } from "./speciesLibrary.js";

test("every catalog species links to at least one documented reference", () => {
  assert.equal(speciesLibrary.length, 9);

  for (const animal of speciesLibrary) {
    assert.ok(animal.references?.length, `${animal.id} must have a reference`);
    for (const reference of animal.references) {
      const source = speciesReferenceSources[reference.sourceId];
      assert.ok(source, `${animal.id} references an unknown source`);
      assert.ok(source.title && source.publisher && source.year, `${reference.sourceId} needs citation details`);
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.ok(["dnpwc.gov.np", "www.ntnc.org.np"].includes(url.hostname), `${reference.sourceId} must use a reviewed institutional host`);
    }
  }
});

test("photo attribution remains separate from ecological references", () => {
  for (const animal of speciesLibrary) {
    assert.match(animal.source, /^https:\/\/commons\.wikimedia\.org\//, `${animal.id} needs its existing image source`);
    assert.ok(animal.photoCredit && animal.license, `${animal.id} needs photo attribution`);
  }
});
