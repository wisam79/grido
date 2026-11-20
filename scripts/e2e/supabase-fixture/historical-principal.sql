-- LOCAL FIXTURE PREREQUISITE ONLY. No production account/data is copied.
-- Historic migrations 20260721000000 and 20260926125510 unconditionally insert
-- this UUID into admin_users referencing auth.users. Without this synthetic,
-- non-login row clean replay fails. It is deleted (cascade) after replay.
-- There is intentionally no password, identity, session or production email.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b2943199-cb11-4adc-9275-5a746aab879c',
  'authenticated', 'authenticated', 'historic-prerequisite@fixture.invalid',
  '{}'::jsonb, '{"name":"Synthetic replay prerequisite"}'::jsonb,
  now(), now()
);
