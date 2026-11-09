-- NAVIN STUDIO: private PostgreSQL dataset foundation.
-- Applied to a brand-new isolated Neon Free project on 2026-11-09.
-- Requires Neon Auth and Data API provisioning first (auth.user_id(), authenticated role).
-- IMPORTANT: Never run against another project. No owner row is automatically created.
-- Offline local E1-E4 JSON files are not imported or modified by this migration.

CREATE TABLE IF NOT EXISTS public.studio_owners (
  user_id text PRIMARY KEY,
  approved_at timestamptz NOT NULL DEFAULT now(),
  note text NOT NULL DEFAULT 'Owner confirmed manually'
);
CREATE TABLE IF NOT EXISTS public.studio_documents (
  owner_user_id text NOT NULL DEFAULT auth.user_id(),
  kind text NOT NULL CHECK (kind IN ('drafts','operations','planning')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision>=1),
  body jsonb NOT NULL CHECK (jsonb_typeof(body)='object' AND octet_length(body::text)<=1048576),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_user_id,kind)
);
CREATE TABLE IF NOT EXISTS public.studio_document_history (
  owner_user_id text NOT NULL,
  kind text NOT NULL,
  revision bigint NOT NULL,
  prior_body jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_user_id,kind,revision)
);
CREATE FUNCTION public.studio_is_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT EXISTS(SELECT 1 FROM public.studio_owners WHERE user_id=auth.user_id());
$$;
CREATE FUNCTION public.studio_validate_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.revision <> 1 THEN RAISE EXCEPTION 'New Studio document must start at revision 1'; END IF;
  NEW.created_at:=now(); NEW.updated_at:=now();
 ELSE
  IF NEW.owner_user_id<>OLD.owner_user_id OR NEW.kind<>OLD.kind THEN RAISE EXCEPTION 'Immutable Studio document identity'; END IF;
  IF NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Studio revision conflict'; END IF;
  NEW.created_at:=OLD.created_at; NEW.updated_at:=now();
 END IF;
 RETURN NEW;
END;
$$;
CREATE FUNCTION public.studio_archive_before_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 INSERT INTO public.studio_document_history(owner_user_id,kind,revision,prior_body)
 VALUES(OLD.owner_user_id,OLD.kind,OLD.revision,OLD.body);
 RETURN NEW;
END;
$$;
CREATE TRIGGER studio_doc_revision BEFORE INSERT OR UPDATE ON public.studio_documents FOR EACH ROW EXECUTE FUNCTION public.studio_validate_revision();
CREATE TRIGGER studio_doc_archive AFTER UPDATE ON public.studio_documents FOR EACH ROW EXECUTE FUNCTION public.studio_archive_before_update();
ALTER TABLE public.studio_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.studio_document_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_document_history FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.studio_owners FROM PUBLIC,anonymous,authenticated;
REVOKE ALL ON public.studio_documents FROM PUBLIC,anonymous,authenticated;
REVOKE ALL ON public.studio_document_history FROM PUBLIC,anonymous,authenticated;
REVOKE ALL ON FUNCTION public.studio_is_owner() FROM PUBLIC,anonymous;
REVOKE ALL ON FUNCTION public.studio_validate_revision() FROM PUBLIC,anonymous,authenticated;
REVOKE ALL ON FUNCTION public.studio_archive_before_update() FROM PUBLIC,anonymous,authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.studio_is_owner() TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.studio_documents TO authenticated;
GRANT SELECT ON public.studio_document_history TO authenticated;
CREATE POLICY studio_docs_owner_read ON public.studio_documents FOR SELECT TO authenticated USING (public.studio_is_owner() AND owner_user_id=auth.user_id());
CREATE POLICY studio_docs_owner_create ON public.studio_documents FOR INSERT TO authenticated WITH CHECK (public.studio_is_owner() AND owner_user_id=auth.user_id());
CREATE POLICY studio_docs_owner_edit ON public.studio_documents FOR UPDATE TO authenticated USING (public.studio_is_owner() AND owner_user_id=auth.user_id()) WITH CHECK (public.studio_is_owner() AND owner_user_id=auth.user_id());
CREATE POLICY studio_history_owner_read ON public.studio_document_history FOR SELECT TO authenticated USING (public.studio_is_owner() AND owner_user_id=auth.user_id());

-- Separate admission check: RLS-only SELECT returns empty rows for unauthorized
-- identities; never confuse an empty document list with owner approval.
CREATE FUNCTION public.studio_owner_status() RETURNS jsonb
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('approved',public.studio_is_owner())
$$;
REVOKE ALL ON FUNCTION public.studio_owner_status() FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION public.studio_owner_status() TO authenticated;
