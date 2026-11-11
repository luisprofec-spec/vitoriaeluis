CREATE TABLE public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  category text NOT NULL DEFAULT 'Geral',
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  sprite_index int,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gifts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gifts TO authenticated;
GRANT ALL ON public.gifts TO service_role;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view gifts" ON public.gifts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert gifts" ON public.gifts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update gifts" ON public.gifts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete gifts" ON public.gifts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.gifts (title, price, category, description, sprite_index, sort) VALUES
('Jantar Romântico na Lua de Mel', 280, 'Lua de Mel', 'Velas, vinho e vista para o mar.', 0, 1),
('Passeio de Barco', 450, 'Lua de Mel', 'Uma tarde velejando em águas azuis.', 1, 2),
('Cafeteira dos Sonhos', 180, 'Casa', 'Para os cafés da manhã a dois.', 2, 3),
('Primeira Compra do Mês', 90, 'Casa', 'A despensa do novo lar agradece.', 3, 4),
('Enxoval Aconchegante', 220, 'Casa', 'Lençóis macios para dias preguiçosos.', 4, 5),
('Voo de Balão ao Amanhecer', 650, 'Lua de Mel', 'Um nascer do sol inesquecível.', 5, 6);