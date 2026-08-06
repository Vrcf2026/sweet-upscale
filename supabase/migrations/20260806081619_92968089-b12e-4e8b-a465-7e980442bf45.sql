REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_doc_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_doc_number() TO authenticated;