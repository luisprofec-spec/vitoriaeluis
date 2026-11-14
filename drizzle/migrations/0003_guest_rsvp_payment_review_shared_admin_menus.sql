ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS confirmed_companions integer NOT NULL DEFAULT 0;
UPDATE public.guests SET confirmed_companions = CASE WHEN rsvp_status = 'confirmed' THEN GREATEST(confirmed_guests_count - 1, 0) ELSE 0 END;
COMMENT ON COLUMN public.guests.confirmed_guests_count IS 'DEPRECATED: use confirmed_companions plus one for confirmed guests; retained for legacy clients.';
ALTER TABLE public.custom_menus ADD COLUMN IF NOT EXISTS link_url text NOT NULL DEFAULT '';
ALTER TABLE public.custom_menus ADD COLUMN IF NOT EXISTS link_label text NOT NULL DEFAULT '';
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS transaction_id text;
ALTER TABLE public.contributions ALTER COLUMN contact SET DEFAULT '';
ALTER TABLE public.contributions DROP CONSTRAINT IF EXISTS contributions_contact_check;
ALTER TABLE public.contributions ADD CONSTRAINT contributions_contact_check CHECK (char_length(contact) <= 160);
ALTER TABLE public.contributions DROP CONSTRAINT IF EXISTS contributions_status_check;
ALTER TABLE public.contributions ADD CONSTRAINT contributions_status_check CHECK (status IN ('Pendente','Confirmado','pending_confirmation','confirmed','cancelled'));
ALTER TABLE public.contributions ALTER COLUMN status SET DEFAULT 'pending_confirmation';
GRANT SELECT,INSERT,UPDATE,DELETE ON public.guests,public.gifts,public.messages,public.custom_menus TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.site_settings TO authenticated;
GRANT SELECT,INSERT ON public.panel_admins TO authenticated;
GRANT SELECT,UPDATE,DELETE ON public.contributions TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.site_settings,public.gifts,public.messages,public.custom_menus TO anon;
GRANT ALL ON public.guests,public.gifts,public.messages,public.custom_menus,public.site_settings,public.panel_admins,public.contributions,public.user_roles TO service_role;
REVOKE INSERT ON public.contributions FROM anon,authenticated;
DROP POLICY IF EXISTS "guests create pending" ON public.contributions;
CREATE INDEX IF NOT EXISTS guests_normalized_name_idx ON public.guests (public.norm_name(full_name));

CREATE OR REPLACE FUNCTION public.validate_guest_record() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF length(trim(NEW.full_name)) < 3 OR NEW.allowed_companions < 0 OR NEW.confirmed_companions < 0 OR NEW.confirmed_companions > NEW.allowed_companions THEN RAISE EXCEPTION 'Invalid guest or companion limit'; END IF;
 IF NEW.rsvp_status <> 'confirmed' THEN NEW.confirmed_companions := 0; END IF;
 NEW.confirmed_guests_count := CASE WHEN NEW.rsvp_status = 'confirmed' THEN 1 + NEW.confirmed_companions ELSE 0 END;
 NEW.updated_at := now(); RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_guest_record ON public.guests;
CREATE TRIGGER validate_guest_record BEFORE INSERT OR UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.validate_guest_record();
CREATE OR REPLACE FUNCTION public.guest_rsvp(_id uuid,_name text,_attending boolean,_companions integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.guests;
BEGIN
 SELECT * INTO g FROM public.guests WHERE id = _id AND public.norm_name(full_name) = public.norm_name(_name) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'guest not found'; END IF;
 IF _attending IS NULL OR _companions IS NULL OR _companions < 0 OR _companions > g.allowed_companions THEN RAISE EXCEPTION 'too many companions'; END IF;
 UPDATE public.guests SET rsvp_status = CASE WHEN _attending THEN 'confirmed' ELSE 'declined' END, confirmed_companions = CASE WHEN _attending THEN _companions ELSE 0 END WHERE id = _id;
END $$;
CREATE OR REPLACE FUNCTION public.find_guest(_name text) RETURNS TABLE(id uuid,full_name text,allowed_companions integer,rsvp_status text,confirmed_guests_count integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT g.id,g.full_name,g.allowed_companions,g.rsvp_status,CASE WHEN g.rsvp_status = 'confirmed' THEN 1 + g.confirmed_companions ELSE 0 END FROM public.guests g WHERE length(trim(_name)) >= 3 AND public.norm_name(g.full_name) = public.norm_name(_name) AND (SELECT count(*) FROM public.guests d WHERE public.norm_name(d.full_name) = public.norm_name(_name)) = 1
$$;
REVOKE ALL ON FUNCTION public.find_guest(text),public.guest_rsvp(uuid,text,boolean,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_guest(text),public.guest_rsvp(uuid,text,boolean,integer) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.unavailable_gift_ids() RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT DISTINCT (item->>'id')::uuid FROM public.contributions c CROSS JOIN LATERAL jsonb_array_elements(c.items) item WHERE c.status IN ('Pendente','Confirmado','pending_confirmation','confirmed') AND item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$$;
REVOKE ALL ON FUNCTION public.unavailable_gift_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unavailable_gift_ids() TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.register_paid_gift(_id uuid,_guest text,_contact text,_items jsonb,_method text,_text text,_card_style text,_proof text,_transaction_id text,_paid boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _item jsonb; _gift public.gifts; _total numeric := 0; _titles text[] := '{}'; _actual jsonb := '[]'::jsonb;
BEGIN
 IF _paid IS DISTINCT FROM true THEN RAISE EXCEPTION 'payment confirmation required'; END IF;
 IF _id IS NULL OR length(trim(_guest)) NOT BETWEEN 1 AND 120 OR length(coalesce(_contact,'')) > 160 OR length(coalesce(_text,'')) > 1000 OR length(coalesce(_transaction_id,'')) > 200 OR _method NOT IN ('Pix','Cartão','Boleto') OR _card_style NOT IN ('floral','honeymoon','minimal','party') THEN RAISE EXCEPTION 'invalid submission'; END IF;
 IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid cart'; END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(_items)) <> jsonb_array_length(_items) THEN RAISE EXCEPTION 'duplicate gift'; END IF;
 IF _proof IS NOT NULL AND (_proof NOT LIKE _id::text || '/%' OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'payment-proofs' AND name = _proof)) THEN RAISE EXCEPTION 'invalid proof'; END IF;
 PERFORM id FROM public.gifts WHERE id IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(_items)) ORDER BY id FOR UPDATE;
 FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
  SELECT * INTO _gift FROM public.gifts WHERE id = (_item->>'id')::uuid;
  IF NOT FOUND OR _gift.id IN (SELECT public.unavailable_gift_ids()) THEN RAISE EXCEPTION 'gift unavailable'; END IF;
  IF (_item->>'price')::numeric IS DISTINCT FROM _gift.price THEN RAISE EXCEPTION 'gift price changed'; END IF;
  _total := _total + _gift.price; _titles := array_append(_titles,_gift.title);
  _actual := _actual || jsonb_build_array(jsonb_build_object('id',_gift.id,'title',_gift.title,'price',_gift.price));
 END LOOP;
 INSERT INTO public.contributions(id,guest,contact,items,total,method,status,proof,transaction_id) VALUES (_id,trim(_guest),trim(coalesce(_contact,'')),_actual,_total,_method,'pending_confirmation',_proof,nullif(trim(_transaction_id),''));
 IF length(trim(coalesce(_text,''))) > 0 THEN INSERT INTO public.messages(guest,text,card_style,gifts) VALUES (trim(_guest),trim(_text),_card_style,array_to_string(_titles,', ')); END IF;
 RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.register_paid_gift(uuid,text,text,jsonb,text,text,text,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_paid_gift(uuid,text,text,jsonb,text,text,text,text,text,boolean) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.claim_admin_invite() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _row public.panel_admins;
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 SELECT email INTO _email FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
 IF _email IS NULL THEN RETURN false; END IF;
 SELECT * INTO _row FROM public.panel_admins WHERE lower(trim(email)) = lower(trim(_email)) AND (user_id IS NULL OR user_id = auth.uid()) ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.panel_admins SET status = 'active',user_id = auth.uid() WHERE id = _row.id;
 IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN INSERT INTO public.user_roles(user_id,role) VALUES (auth.uid(),'admin'); END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_admin_invite(),public.revoke_panel_admin(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_invite(),public.revoke_panel_admin(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.activate_confirmed_admin_invite() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.email_confirmed_at IS NOT NULL THEN
  UPDATE public.panel_admins SET status = 'active',user_id = NEW.id WHERE lower(trim(email)) = lower(trim(NEW.email)) AND (user_id IS NULL OR user_id = NEW.id);
  IF FOUND AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin') THEN INSERT INTO public.user_roles(user_id,role) VALUES (NEW.id,'admin'); END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_confirmed_admin_invite ON auth.users;
CREATE TRIGGER on_confirmed_admin_invite AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.activate_confirmed_admin_invite();
DROP POLICY IF EXISTS "admin invite" ON public.panel_admins;
CREATE POLICY "admin invite" ON public.panel_admins FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND status = 'invited' AND user_id IS NULL AND invited_by = auth.uid());
DROP POLICY IF EXISTS "guests upload proof" ON storage.objects;
CREATE POLICY "guests upload proof" ON storage.objects FOR INSERT TO anon,authenticated WITH CHECK (bucket_id = 'payment-proofs' AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f-]+\.(pdf|png|jpg|jpeg|webp)$');
DROP POLICY IF EXISTS "admins read proof" ON storage.objects;
CREATE POLICY "admins read proof" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins delete proof" ON storage.objects;
CREATE POLICY "admins delete proof" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(),'admin'));
