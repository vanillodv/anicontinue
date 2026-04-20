import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlanById, getPackById } from '@/lib/plans';
import { randomUUID } from 'crypto';

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function createYooKassaPayment(params: {
  amount: number;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}) {
  const credentials = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

  const body = {
    amount: {
      value: params.amount.toFixed(2),
      currency: 'RUB',
    },
    confirmation: {
      type: 'redirect',
      return_url: params.returnUrl,
    },
    capture: true,
    description: params.description,
    metadata: params.metadata,
  };

  const res = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Idempotence-Key': params.idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.description || `YooKassa error ${res.status}`);
  }

  return res.json();
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const { type, id } = body as { type: 'plan' | 'pack'; id: string };

    if (!type || !id || !['plan', 'pack'].includes(type)) {
      return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });
    }

    let amount = 0;
    let description = '';

    if (type === 'plan') {
      const plan = getPlanById(id as any);
      if (!plan || plan.price === 0) {
        return NextResponse.json({ error: 'INVALID_PLAN' }, { status: 400 });
      }
      amount = plan.price;
      description = `Подписка AniContinue «${plan.name}» на 30 дней`;
    } else {
      const pack = getPackById(id as any);
      if (!pack) {
        return NextResponse.json({ error: 'INVALID_PACK' }, { status: 400 });
      }
      amount = pack.price;
      description = `Пакет AniContinue — ${pack.chapters} генераций`;
    }

    const idempotencyKey = randomUUID();
    const returnUrl = `${APP_URL}/payment/success?type=${type}&id=${id}`;

    const payment = await createYooKassaPayment({
      amount,
      description,
      returnUrl,
      metadata: {
        user_id: user.id,
        purchase_type: type,
        purchase_id: id,
      },
      idempotencyKey,
    });

    // Критично: лог должен быть записан ДО возврата paymentId.
    // Без него webhook не сможет идемпотентно обработать оплату.
    const { error: logErr } = await supabase.from('payment_logs').insert({
      user_id: user.id,
      payment_id: payment.id,
      purchase_type: type,
      purchase_id: id,
      amount,
      status: 'pending',
      idempotency_key: idempotencyKey,
    });
    if (logErr) {
      console.error('payment_logs insert failed:', logErr.message);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }

    return NextResponse.json({
      paymentId: payment.id,
      confirmationUrl: payment.confirmation.confirmation_url,
    });

  } catch (error: any) {
    console.error('Payment create error:', error);
    return NextResponse.json(
      { error: 'PAYMENT_CREATE_FAILED', message: error.message },
      { status: 500 }
    );
  }
}
