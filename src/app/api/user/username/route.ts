import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const RESERVED = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'support', 'staff',
  'anicontinue', 'root', 'system', 'null', 'undefined', 'owner', 'api',
]);

// Разрешены: латиница, кириллица, цифры, пробел, подчёркивание, дефис, точка.
const USERNAME_RE = /^[A-Za-z0-9_\-. а-яА-ЯёЁ]+$/;

// Смена username. Сама логика валидации продублирована в триггере на стороне БД
// (profiles_validate_username) — это единственная преграда от прямого PATCH через
// Supabase REST, но на API-слое отдаём более понятные сообщения.
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = typeof body?.username === 'string' ? body.username : '';
  const username = raw.trim();

  if (!username || username.length < 2 || username.length > 32) {
    return NextResponse.json({ error: 'INVALID_LENGTH', message: 'Имя должно быть от 2 до 32 символов' }, { status: 400 });
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: 'INVALID_CHARS', message: 'Разрешены буквы, цифры, пробелы, дефис, подчёркивание и точка' }, { status: 400 });
  }
  if (RESERVED.has(username.toLowerCase())) {
    return NextResponse.json({ error: 'RESERVED', message: 'Это имя зарезервировано' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', user.id);

  if (error) {
    // 23505 = unique_violation (наш индекс profiles_username_lower_uniq)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'TAKEN', message: 'Имя уже занято' }, { status: 409 });
    }
    return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, username });
}
