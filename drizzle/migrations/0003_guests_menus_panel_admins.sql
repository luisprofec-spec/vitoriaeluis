CREATE OR REPLACE FUNCTION public.norm_name(_t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  select lower(translate(regexp_replace(trim(coalesce(_t,'')), '\s+', ' ', 'g'),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'))
$$;

CREATE TABLE public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  allowed_companions integer NOT NULL DEFAULT 0 CHECK (allowed_companions >= 0),
  rsvp_status text NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending','confirmed','declined')),
  confirmed_guests_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests TO authenticated;
GRANT ALL ON public.guests TO service_role;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage guests" ON public.guests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.find_guest(_name text)
RETURNS TABLE(id uuid, full_name text, allowed_companions integer, rsvp_status text, confirmed_guests_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select g.id, g.full_name, g.allowed_companions, g.rsvp_status, g.confirmed_guests_count
  from public.guests g where length(trim(_name)) >= 3 and public.norm_name(g.full_name) = public.norm_name(_name) limit 1
$$;
GRANT EXECUTE ON FUNCTION public.find_guest(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.guest_rsvp(_id uuid, _name text, _attending boolean, _companions integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare g public.guests;
begin
  select * into g from public.guests where id = _id and public.norm_name(full_name) = public.norm_name(_name);
  if not found then raise exception 'guest not found'; end if;
  if _attending and (_companions < 0 or _companions > g.allowed_companions) then raise exception 'too many companions'; end if;
  update public.guests set rsvp_status = case when _attending then 'confirmed' else 'declined' end,
    confirmed_guests_count = case when _attending then 1 + _companions else 0 end, updated_at = now() where id = _id;
end $$;
GRANT EXECUTE ON FUNCTION public.guest_rsvp(uuid, text, boolean, integer) TO anon, authenticated;

ALTER TABLE public.contributions ADD COLUMN guest_id uuid, ADD COLUMN proof text;

CREATE TABLE public.custom_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_menus TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_menus TO authenticated;
GRANT ALL ON public.custom_menus TO service_role;
ALTER TABLE public.custom_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public active menus" ON public.custom_menus FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert menus" ON public.custom_menus FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update menus" ON public.custom_menus FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete menus" ON public.custom_menus FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.panel_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active')),
  invited_by uuid,
  user_id uuid,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.panel_admins TO authenticated;
GRANT ALL ON public.panel_admins TO service_role;
ALTER TABLE public.panel_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read panel admins" ON public.panel_admins FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin invite" ON public.panel_admins FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND status = 'invited' AND user_id IS NULL);

CREATE OR REPLACE FUNCTION public.claim_admin_invite() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _email text; _row public.panel_admins;
begin
  if auth.uid() is null then return false; end if;
  select email into _email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if _email is null then return false; end if;
  select * into _row from public.panel_admins where lower(email) = lower(_email);
  if not found then return false; end if;
  update public.panel_admins set status = 'active', user_id = auth.uid() where id = _row.id;
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    insert into public.user_roles (user_id, role) values (auth.uid(), 'admin');
  end if;
  return true;
end $$;
GRANT EXECUTE ON FUNCTION public.claim_admin_invite() TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_panel_admin(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _row public.panel_admins;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  select * into _row from public.panel_admins where id = _id;
  if not found then return; end if;
  if _row.user_id = auth.uid() then raise exception 'cannot revoke yourself'; end if;
  if _row.user_id is not null then delete from public.user_roles where user_id = _row.user_id and role = 'admin'; end if;
  delete from public.panel_admins where id = _id;
end $$;
GRANT EXECUTE ON FUNCTION public.revoke_panel_admin(uuid) TO authenticated;