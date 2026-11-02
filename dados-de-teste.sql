-- Itens de exemplo para testar a busca. Execute no SQL Editor do Supabase,
-- depois de executar o supabase-schema.sql e de criar uma conta no site.
-- Os itens são criados para todas as contas, sem duplicar se o script rodar de novo.
insert into public.items (owner_id, name, category, brand, model, sku, quantity, minimum_quantity, box, shelf, notes)
select u.id, v.name, v.category, v.brand, v.model, v.sku, v.quantity, v.minimum_quantity, v.box, v.shelf, v.notes
from auth.users as u
cross join (values
  ('Placa fonte',            'Placa',       'Samsung',   'UN50AU7700',  'PL-001', 4,  2, 'Caixa 1',  'Prateleira A', 'Testada e funcionando'),
  ('Placa principal',        'Placa',       'LG',        '43LM6300',    'PL-002', 1,  2, 'Caixa 1',  'Prateleira A', 'Só resta uma unidade'),
  ('Placa T-CON',            'Placa',       'Philips',   '50PUG6513',   'PL-003', 3,  1, 'Caixa 2',  'Prateleira A', ''),
  ('Capacitor 1000uF 25V',   'Componente',  'Panasonic', 'EEUFR1E102',  'CP-010', 120, 50, 'Caixa 3', 'Prateleira B', 'Eletrolítico'),
  ('Resistor 10k ohm',       'Componente',  'Yageo',     'CFR-25JB',    'RS-021', 300, 100, 'Caixa 3', 'Prateleira B', 'Pacote com 100'),
  ('Transistor MOSFET',      'Componente',  'Infineon',  'IRF540N',     'TR-005', 8,  10, 'Caixa 4',  'Prateleira B', 'Repor em breve'),
  ('Display LCD 16x2',       'Peça',        'Hitachi',   'HD44780',     'DS-002', 6,  2, 'Caixa 5',  'Prateleira C', ''),
  ('Cabo flat 30 vias',      'Peça',        'Samsung',   'BN96-45283A', 'CB-014', 15, 5, 'Caixa 6',  'Prateleira C', 'Para TVs de 50 polegadas'),
  ('Ferro de solda 60W',     'Ferramenta',  'Hikari',    'HK-936',      'FR-001', 2,  1, 'Gaveta 1', 'Bancada',      'Com ponta extra'),
  ('Estanho 0,8 mm',         'Outro',       'Best',      'BST-800',     'ES-003', 5,  2, 'Gaveta 1', 'Bancada',      'Rolo de 100 g')
) as v(name, category, brand, model, sku, quantity, minimum_quantity, box, shelf, notes)
where not exists (
  select 1 from public.items i where i.owner_id = u.id and i.sku = v.sku
);
