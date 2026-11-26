-- M8: Seed editable finance catalogue and public site content.
-- Existing rows are preserved so a later deploy cannot overwrite office edits.

INSERT INTO finance_products (category, name, description, document_checklist, is_active, sort_order)
VALUES
  ('vehicle', 'Vehicle Finance', 'Finance for new and pre-owned passenger vehicles, bakkies and light commercial vehicles, for private or business use.', '[]'::jsonb, true, 10),
  ('equipment', 'Equipment Finance', 'Structured finance for yellow metal, machinery, agricultural, medical and specialised operational equipment.', '[]'::jsonb, true, 20),
  ('commercial-asset', 'Commercial Asset Finance', 'Finance for heavy commercial vehicles, trailers, logistics fleets and other income-generating commercial assets.', '[]'::jsonb, true, 30),
  ('other', 'Other Finance', 'Requirements outside the standard categories, assessed case by case by the Oxford office.', '[]'::jsonb, true, 40)
ON CONFLICT (category) DO NOTHING;

INSERT INTO site_content (key, title, body, status)
VALUES
  ('home.hero.eyebrow', 'Homepage hero eyebrow', 'Oxford Business Group · Finance Intermediary', 'published'),
  ('home.hero.intro', 'Homepage hero introduction', 'Vehicle, equipment and commercial asset finance for individuals and businesses — prepared with care and presented to the right finance providers.', 'published'),
  ('home.hero.primary_cta', 'Homepage primary action', 'Apply for finance', 'published'),
  ('home.hero.secondary_cta', 'Homepage secondary action', 'Partner with Oxford', 'published'),
  ('solutions.hero.title', 'Finance solutions page title', 'Finance for the assets that move you forward.', 'published'),
  ('solutions.hero.intro', 'Finance solutions page introduction', 'Oxford Business Group prepares your application and presents it to suitable finance providers across four categories, for individuals and businesses alike.', 'published')
ON CONFLICT (key) DO NOTHING;
