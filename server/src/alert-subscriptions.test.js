import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, validEmail, validateCoordinates } from "./alert-subscriptions.js";

test("phone normalization removes common formatting but preserves international prefix", () => {
  assert.equal(normalizePhone("+977 980-123-4567"), "+9779801234567");
  assert.equal(normalizePhone("(980) 123 4567"), "9801234567");
});

test("email validation accepts normal addresses and rejects malformed values", () => {
  assert.equal(validEmail("farmer@example.com"), true);
  assert.equal(validEmail("not-an-email"), false);
  assert.equal(validEmail("farmer@"), false);
});

test("farm coordinate validation accepts valid GPS and manual points", () => {
  assert.deepEqual(validateCoordinates("28.21", "83.99"), { latitude: 28.21, longitude: 83.99 });
  assert.deepEqual(validateCoordinates("-90", "180"), { latitude: -90, longitude: 180 });
});

test("farm coordinate validation rejects missing and out-of-range points", () => {
  assert.throws(() => validateCoordinates("", "83.99"), /valid farm latitude and longitude/);
  assert.throws(() => validateCoordinates(null, "83.99"), /valid farm latitude and longitude/);
  assert.throws(() => validateCoordinates("28.21", undefined), /valid farm latitude and longitude/);
  assert.throws(() => validateCoordinates("91", "83.99"), /valid farm latitude and longitude/);
  assert.throws(() => validateCoordinates("28.21", "-181"), /valid farm latitude and longitude/);
});
