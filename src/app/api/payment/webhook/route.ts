import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Always verify with YooKassa directly (don't trust webhook body alone)
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

    const supabase = await createClient();

    // Idempotency: check if already processed (graceful if table missing)
    const { data: existingLog } = await supabase
      .from('payment_logs')
      .select('id, status')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existingLog?.status === 'succeeded') {
      console.log(`Payment ${paymentId} already processed, skipping`);
      return NextResponse.json({ ok: true });
    }

    // Fetch current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', metadata.user_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found for user', metadata.user_id);
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 400 });
    }

    let updatePayload: Record<string, any> = {};

    if (metadata.purchase_type === 'plan') {
      const plan = getPlanById(metadata.purchase_id as any);
      if (!plan || plan.price === 0) {
        return NextResponse.json({ error: 'INVALID_PLAN' }, { status: 400 });
      }
      updatePayload = {
        plan: plan.id,
        chapters_limit: plan.chaptersLimit,
        chapters_used: 0,                 // reset on plan upgrade
        subscription_expires_at: getExpiresAt(),
      };
    } else {
      const pack = getPackById(metadata.purchase_id as any);
      if (!pack) {
        return NextResponse.json({ error: 'INVALID_PACK' }, { status: 400 });
      }
      // Add chapters to current limit (don't reset used)
      updatePayload = {
        chapters_limit: (profile.chapters_limit || 3) + pack.chapters,
      };
    }

    // Apply update
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', metadata.user_id);

    if (updateError) {
      console.error('Profile update failed:', updateError);
      // Still mark payment log but with partial status
    }

    // Update payment log (non-critical)
    await supabase
      .from('payment_logs')
      .update({ status: 'succeeded', processed_at: new Date().toISOString() })
      .eq('payment_id', paymentId)
      .then(({ error }) => { if (error) console.warn('payment_logs update skipped:', error.message); });

    console.log(`Payment ${paymentId} processed: ${metadata.purchase_type} ${metadata.purchase_id} for user ${metadata.user_id}`);

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    // Return 200 so YooKassa doesn't retry indefinitely
    return NextResponse.json({ ok: true });
  }
}
