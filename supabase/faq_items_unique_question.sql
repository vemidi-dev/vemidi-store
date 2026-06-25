-- Enforce unique normalized FAQ questions in the central library.
-- Run after faq_management.sql.
-- Safe to re-run. Does NOT delete or merge duplicate rows automatically.
--
-- Pre-check (read-only):
--   select lower(btrim(question)) as normalized_question,
--          count(*) as item_count,
--          array_agg(id order by created_at, id) as item_ids,
--          array_agg(question order by created_at, id) as questions
--   from public.faq_items
--   group by 1
--   having count(*) > 1;

begin;

do $$
begin
  if exists (
    select 1
    from public.faq_items
    group by lower(btrim(question))
    having count(*) > 1
  ) then
    raise exception 'faq_items_duplicate_questions_exist'
      using
        errcode = 'P0001',
        hint = 'Resolve duplicate FAQ items manually before applying faq_items_unique_question.sql.';
  end if;
end;
$$;

create unique index if not exists faq_items_question_normalized_unique
  on public.faq_items (lower(btrim(question)));

commit;
