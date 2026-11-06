-- What the public website (role mgarage_web) may do. Applied as mgarage_api.
set search_path = mgarage;

grant usage on schema mgarage to mgarage_web;
grant select on settings, images, slides, services, service_images, testimonials, faqs to mgarage_web;
grant execute on function submit_booking(text,text,text,text,text,date,text,text) to mgarage_web;

create policy web_read on settings       for select to mgarage_web using (key like 'public.%');
create policy web_read on images         for select to mgarage_web using (true);
create policy web_read on slides         for select to mgarage_web using (active);
create policy web_read on services       for select to mgarage_web using (active);
create policy web_read on service_images for select to mgarage_web using (true);
create policy web_read on testimonials   for select to mgarage_web using (active);
create policy web_read on faqs           for select to mgarage_web using (active);
