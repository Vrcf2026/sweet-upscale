CREATE POLICY "arquivo leitura" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'arquivo' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(), 'superadmin'::app_role)));

CREATE POLICY "arquivo insere" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'arquivo' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "arquivo atualiza" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'arquivo' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'arquivo' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "arquivo apaga" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'arquivo' AND (storage.foldername(name))[1] = auth.uid()::text);