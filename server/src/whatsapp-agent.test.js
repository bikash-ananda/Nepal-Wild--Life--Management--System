import test from "node:test";
import assert from "node:assert/strict";
import { publicSettings } from "./whatsapp-agent.js";

const names = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
];

function withEnv(values, callback) {
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) {
    if (Object.hasOwn(values, name)) process.env[name] = values[name];
    else delete process.env[name];
  }
  try { callback(); }
  finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}

const row = {
  official_number: "9768004157",
  display_name: "WLMS Wildlife Alert Assistant",
  default_language: "ne",
  greeting_np: "नमस्कार",
  greeting_en: "Hello",
  webhook_verified_at: null,
  updated_at: "2026-11-17T00:00:00.000Z",
};

test("public settings keep live delivery locked and never expose provider secrets", () => {
  withEnv({
    WHATSAPP_ACCESS_TOKEN: "top-secret-token",
    WHATSAPP_PHONE_NUMBER_ID: "123456",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-secret",
    WHATSAPP_APP_SECRET: "app-secret",
  }, () => {
    const settings = publicSettings(row);
    assert.equal(settings.official_number, "9768004157");
    assert.equal(settings.connection_status, "credentials_present_pending_integration");
    assert.equal(settings.agent_enabled, false);
    assert.equal(settings.live_delivery_enabled, false);
    assert.equal(settings.test_mode, true);
    assert.equal(settings.webhook_verified, false);
    for (const secret of ["top-secret-token", "123456", "verify-secret", "app-secret"]) {
      assert.equal(JSON.stringify(settings).includes(secret), false);
    }
  });
});

test("missing credentials are reported as not connected and live actions remain disabled", () => {
  withEnv({}, () => {
    const settings = publicSettings(row);
    assert.equal(settings.connection_status, "not_connected");
    assert.equal(settings.credentials_present, false);
    assert.equal(settings.agent_enabled, false);
    assert.equal(settings.live_delivery_enabled, false);
    assert.equal(settings.test_mode, true);
  });
});
