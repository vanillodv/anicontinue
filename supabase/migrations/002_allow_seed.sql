-- Разрешаем анонимный upsert для инициализации данных в разработке
create policy "Allow anonymous upsert for seed" 
on public.anime for insert 
with check (true);

create policy "Allow anonymous update for seed" 
on public.anime for update 
using (true);
