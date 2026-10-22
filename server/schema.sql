CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'field_worker',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'disabled')),
  site_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  session_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS app_records (
  entity text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  PRIMARY KEY (entity, id)
);
CREATE INDEX IF NOT EXISTS app_records_entity_created_idx ON app_records (entity, created_at DESC);
CREATE INDEX IF NOT EXISTS app_records_data_gin_idx ON app_records USING gin (data jsonb_path_ops);
CREATE UNIQUE INDEX IF NOT EXISTS wildlife_observation_capture_id_uniq
  ON app_records ((data->>'capture_id'))
  WHERE entity = 'WildlifeObservation' AND data ? 'capture_id';

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL UNIQUE,
  original_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL,
  sha256 text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  uploaded_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_assets_hash_idx ON media_assets (sha256);

CREATE TABLE IF NOT EXISTS camera_connections (
  camera_entity text NOT NULL DEFAULT 'Camera' CHECK (camera_entity = 'Camera'),
  camera_id text PRIMARY KEY,
  site_id text NOT NULL,
  path_name text NOT NULL UNIQUE,
  network_mode text NOT NULL CHECK (network_mode IN ('public_forward', 'vpn_routed')),
  network_label text NOT NULL DEFAULT '',
  protocol text NOT NULL CHECK (protocol IN ('rtsp', 'rtsps')),
  host text NOT NULL,
  port integer NOT NULL CHECK (port BETWEEN 1 AND 65535),
  stream_path text NOT NULL,
  username text NOT NULL DEFAULT '',
  password_ciphertext text NOT NULL,
  password_iv text NOT NULL,
  password_tag text NOT NULL,
  rtsp_transport text NOT NULL DEFAULT 'tcp' CHECK (rtsp_transport IN ('tcp', 'udp')),
  enabled boolean NOT NULL DEFAULT true,
  state text NOT NULL DEFAULT 'configured' CHECK (state IN ('configured', 'apply_failed', 'disabled')),
  last_test_status text NOT NULL DEFAULT 'never' CHECK (last_test_status IN ('never', 'passed', 'failed')),
  last_test_at timestamptz,
  last_applied_at timestamptz,
  last_error text NOT NULL DEFAULT '',
  configured_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (camera_entity, camera_id) REFERENCES app_records(entity, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS camera_connections_site_idx ON camera_connections (site_id, enabled);
ALTER TABLE camera_connections DROP CONSTRAINT IF EXISTS camera_connections_protocol_check;
ALTER TABLE camera_connections ADD CONSTRAINT camera_connections_protocol_check CHECK (protocol IN ('rtsp', 'rtsps', 'http', 'https'));

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  record_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events (created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text NOT NULL,
  event_key text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_id, event_key)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_secret text NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  subscription_id uuid REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'web_push',
  status text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_key, subscription_id, channel)
);
ALTER TABLE notification_deliveries ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE notification_deliveries ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE notification_deliveries ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS notification_deliveries_created_idx ON notification_deliveries (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS app_records_verified_alert_dedupe_idx
  ON app_records ((data->>'verification_sample_id'))
  WHERE entity = 'Alert' AND data ? 'verification_sample_id';
