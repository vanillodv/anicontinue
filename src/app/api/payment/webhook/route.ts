import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/admin/guard';
import { getPlanById, getPackById, getExpiresAt } from '@/lib/plans';

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';

async function verifyPayment(paymentId: string): Promise<any> {
  const credentials = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

  const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    headers: {
      'Authorization': `Basic ${credentials}`,
    },
  });

  if (!res.ok) {
    throw new Error(`YooKassa verify failed: ${res.status}`);
  }

  return res.json();
}

export async function POST(req: Request) {
  try {
    const event = await req.json();
    console.log('YooKassa webhook event:', event.event, event.object?.id);

    if (event.event !== 'payment.succeeded') {
      return NextResponse.json({ ok: true });
    }

    const paymentObj = event.object;
    const paymentId = paymentObj?.id;

    if (!paymentId) {
      return NextResponse.json({ error: 'NO_PAYMENT_ID' }, { status: 400 });
    }

    // Независимая верификация у YooKassa (не доверяем телу webhook'а)
    const verified = await verifyPayment(paymentId);

    if (verified.status !== 'succeeded') {
      console.log(`Payment ${paymentId} not succeeded, status: ${verified.status}`);
      return NextResponse.json({ ok: true });
    }

    const metadata = verified.metadata as {
      user_id: string;
      purchase_type: 'plan' | 'pack';
      purchase_id: string;
    };

    if (!metadata?.user_id || !metadata?.purchase_type || !metadata?.purchase_id) {
      console.error('Missing metadata in payment', paymentId);
      return NextResponse.json({ error: 'MISSING_METADATA' }, { status: 400 });
    }

    // service role: webhook не имеет сессии пользователя
    const svc = serviceClient();

    // Получим текущий профиль для корректного расчёта chapters_limit при pack
    const { data: profile, error: profileError } = await svc
      .from('profiles')
      .select('chapters_limit')
      .eq('id', metadata.user_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found for user', metadata.user_id);
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 400 });
    }

    let updatePayload: Record<string, any> = {};
    let amount = 0;

    if (metadata.purchase_type === 'plan') {
      const plan = getPlanById(metadata.purchase_id as any);
      if (!plan || plan.price === 0) {
        return NextResponse.json({ error: 'INVALID_PLAN' }, { status: 400 });
      }
      amount = plan.price;
      updatePayload = {
        plan: plan.id,
        chapters_limit: plan.chaptersLimit,
        chapters_used: 0,
        subscription_expires_at: getExpiresAt(),
      };
    } else {
      const pack = getPackById(metadata.purchase_id as any);
      if (!pack) {
        return NextResponse.json({ error: 'INVALID_PACK' }, { status: 400 });
      }
      amount = pack.price;
      updatePayload = {
        chapters_limit: (profile.chapters_limit || 3) + pack.chapters,
      };
    }

    // Атомарное применение: RPC берёт for-update лок на payment_logs,
    // помечает succeeded (или выходит, если уже применён), и только тогда
    // обновляет profiles. Повторный webhook не даст задвоение.
    const { data: applied, error: rpcError } = await svc.rpc('apply_payment', {
      p_payment_id: paymentId,
      p_user_id: metadata.user_id,
      p_purchase_type: metadata.purchase_type,
      p_purchase_id: metadata.purchase_id,
      p_amount: amount,
      p_update: updatePayload,
    });

    if (rpcError) {
      console.error('apply_payment RPC failed:', rpcError);
      return NextResponse.json({ error: 'APPLY_FAILED' }, { status: 500 });
    }

    if (applied === false) {
      console.log(`Payment ${paymentId} already applied, skipping`);
      return NextResponse.json({ ok: true });
    }

    console.log(`Payment ${paymentId} processed: ${metadata.purchase_type} ${metadata.purchase_id} for user ${metadata.user_id}`);

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    // Возвращаем 200, чтобы YooKassa не ретраил бесконечно
    return NextResponse.json({ ok: true });
  }
}
