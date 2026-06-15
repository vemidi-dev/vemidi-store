-- Fix invalid categories.slug: 'sakndinavski muh' → 'skandinavski-muh'
-- Idempotent. Does NOT change category id or product_categories relations.
--
-- BACKUP (run before apply):
--   SELECT id, slug, name, category_type, parent_id
--   FROM public.categories
--   WHERE slug IN ('sakndinavski muh', 'sakndinavski-muh', 'skandinavski-muh');
--
-- APPLY:
--   Supabase SQL Editor: paste and run the entire file contents.
--   psql: \i supabase/fix_category_slug_skandinavski_muh.sql
--
-- CHECK (after apply):
--   SELECT id, slug FROM public.categories
--   WHERE slug ILIKE '%skandinavski%' OR slug ILIKE '%sakndinavski%';
--   -- Expect: single row with slug = 'skandinavski-muh'
--   -- Expect: zero rows with slug containing space or 'sakndinavski'

-- Pre-flight validation (read-only)
-- SELECT id, slug, name FROM public.categories
-- WHERE slug IN ('sakndinavski muh', 'sakndinavski-muh', 'skandinavski-muh')
-- ORDER BY slug;

DO $$
DECLARE
  target_slug constant text := 'skandinavski-muh';
  bad_slugs constant text[] := ARRAY['sakndinavski muh', 'sakndinavski-muh'];
  bad_row record;
  existing_target_id uuid;
BEGIN
  SELECT id INTO existing_target_id
  FROM public.categories
  WHERE slug = target_slug
  LIMIT 1;

  FOR bad_row IN
    SELECT id, slug
    FROM public.categories
    WHERE slug = ANY (bad_slugs)
  LOOP
    IF existing_target_id IS NOT NULL AND existing_target_id <> bad_row.id THEN
      RAISE EXCEPTION
        'Slug collision: canonical % already exists (id %). Bad row: % (id %). Merge manually.',
        target_slug,
        existing_target_id,
        bad_row.slug,
        bad_row.id;
    END IF;

    UPDATE public.categories
    SET slug = target_slug
    WHERE id = bad_row.id
      AND slug = bad_row.slug;

    existing_target_id := bad_row.id;

    RAISE NOTICE 'Updated categories.id % from slug % to %',
      bad_row.id,
      bad_row.slug,
      target_slug;
  END LOOP;

  IF NOT FOUND THEN
    RAISE NOTICE 'No bad slug rows found — migration already applied or not needed.';
  END IF;
END $$;

-- Post-apply validation
SELECT
  id,
  slug,
  name,
  category_type
FROM public.categories
WHERE slug = 'skandinavski-muh'
   OR slug ILIKE '%sakndinavski%';
