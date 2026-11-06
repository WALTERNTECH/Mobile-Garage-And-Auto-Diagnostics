-- Mobile Garage & Auto Diagnostics: two login roles and one schema.
--   mgarage_api  owns schema mgarage (admin dashboard)
--   mgarage_web  public website: read published content, file bookings via submit_booking()
create role mgarage_api login password '{{API_VERIFIER}}';
create role mgarage_web login password '{{WEB_VERIFIER}}';
alter role mgarage_api set search_path = mgarage;
alter role mgarage_web set search_path = mgarage;
alter role mgarage_api set statement_timeout = '30s';
alter role mgarage_web set statement_timeout = '10s';
grant mgarage_api to postgres;
create schema mgarage authorization mgarage_api;
revoke all on schema mgarage from public;
set role mgarage_api;
{{SCHEMA}}
{{GRANTS}}
reset role;
revoke mgarage_api from postgres;
