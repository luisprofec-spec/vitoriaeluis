create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

-- First account ever created becomes the couple's admin account.
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_first_admin after insert on auth.users
for each row execute function public.handle_first_admin();

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant update, insert on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings admin update" on public.site_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "settings admin insert" on public.site_settings for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  guest text not null check (char_length(guest) between 1 and 120),
  contact text not null check (char_length(contact) between 3 and 160),
  items jsonb not null,
  total numeric(10,2) not null check (total > 0 and total < 1000000),
  method text not null check (method in ('Pix','Cartão','Boleto')),
  status text not null default 'Pendente' check (status in ('Pendente','Confirmado'))
);
grant insert on public.contributions to anon, authenticated;
grant select, update, delete on public.contributions to authenticated;
grant all on public.contributions to service_role;
alter table public.contributions enable row level security;
create policy "guests create pending" on public.contributions for insert to anon, authenticated with check (status = 'Pendente');
create policy "admin read" on public.contributions for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin update" on public.contributions for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin delete" on public.contributions for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  guest text not null check (char_length(guest) between 1 and 120),
  text text not null check (char_length(text) between 1 and 1000),
  card_style text not null default 'floral' check (card_style in ('floral','honeymoon','minimal','party')),
  gifts text,
  visible boolean not null default true
);
grant select, insert on public.messages to anon;
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "public visible messages" on public.messages for select to anon, authenticated using (visible or public.has_role(auth.uid(), 'admin'));
create policy "guests post messages" on public.messages for insert to anon, authenticated with check (visible = true);
create policy "admin update messages" on public.messages for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin delete messages" on public.messages for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.site_settings (id, data) values (1, '{
  "partner1": "Helena", "partner2": "Rafael",
  "tagline": "Vamos nos casar",
  "story": "Nos conhecemos numa manhã chuvosa de 2019, disputando a última mesa de uma cafeteria. Dividimos a mesa, depois a conversa, e nunca mais paramos.",
  "heroImage": "", "storyImage": "", "gallery": [],
  "date": "2028-10-14",
  "ceremony": {"time": "16:00", "place": "Capela Nossa Senhora da Luz", "address": "Estrada do Vale, 120 · Campos do Jordão, SP"},
  "reception": {"time": "18:30", "place": "Fazenda Santa Clara", "address": "Rod. SP-123, km 8 · Campos do Jordão, SP"},
  "pixType": "E-mail", "pixKey": "noivos2028@email.com",
  "whatsapp": "5511999999999", "cardLink": "", "boletoLink": "", "goal": 15000
}'::jsonb);

insert into public.contributions (created_at, guest, contact, items, total, method, status) values
('2026-10-02', 'Marina Alves', 'marina@email.com', '[{"id":"jantar","title":"Jantar Romântico na Lua de Mel","price":280}]', 280, 'Pix', 'Confirmado'),
('2026-10-11', 'Tio Carlos', '(11) 98888-1111', '[{"id":"balao","title":"Voo de Balão ao Amanhecer","price":650}]', 650, 'Pix', 'Confirmado'),
('2026-10-20', 'Juliana e Pedro', 'ju.pedro@email.com', '[{"id":"cafeteira","title":"Cafeteira dos Sonhos","price":180},{"id":"mercado","title":"Primeira Compra do Mês","price":90}]', 270, 'Cartão', 'Pendente'),
('2026-11-03', 'Vó Lourdes', '(11) 97777-2222', '[{"id":"mercado","title":"Primeira Compra do Mês","price":90}]', 90, 'Pix', 'Pendente');

insert into public.messages (created_at, guest, text, card_style, gifts) values
('2026-10-02', 'Marina Alves', 'Que esse amor siga crescendo a cada dia. Vocês são inspiração!', 'minimal', 'Jantar Romântico na Lua de Mel'),
('2026-10-11', 'Tio Carlos', 'Aproveitem cada segundo lá no alto. Amo vocês!', 'honeymoon', 'Voo de Balão ao Amanhecer'),
('2026-10-20', 'Juliana e Pedro', 'Muitos cafés, risadas e domingos juntinhos. Felicidades!', 'party', 'Cafeteira dos Sonhos, Primeira Compra do Mês'),
('2026-11-03', 'Vó Lourdes', 'Meus netos queridos, que Deus abençoe essa união. Despensa cheia sempre!', 'floral', 'Primeira Compra do Mês');
