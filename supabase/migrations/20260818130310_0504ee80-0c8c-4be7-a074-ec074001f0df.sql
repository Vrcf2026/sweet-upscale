REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_doc_number() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_instalacao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_doc_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_instalacao(uuid) TO authenticated;

DROP POLICY IF EXISTS "user_roles superadmin insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles superadmin update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles superadmin delete" ON public.user_roles;

CREATE POLICY "user_roles superadmin insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'superadmin') AND user_id <> auth.uid());

CREATE POLICY "user_roles superadmin update" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'superadmin') AND user_id <> auth.uid())
WITH CHECK (public.has_role(auth.uid(),'superadmin') AND user_id <> auth.uid());

CREATE POLICY "user_roles superadmin delete" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'superadmin') AND user_id <> auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;