import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENTITLEMENT = 'explorer';
const PRODUCT_FRAGMENTS = ['routeflow_explorer_annual', 'routeflow_explorer_monthly'];

type RcEvent = {
  type?: string;
  app_user_id?: string;
  entitlement_ids?: string[] | null;
  product_id?: string | null;
  new_product_id?: string | null;
  expiration_at_ms?: number | null;
  id?: string;
};

function verifyAuth(req: Request, secret: string): boolean {
  const expected = `Bearer ${secret}`;
  const auth = req.headers.get('Authorization')?.trim() ?? '';
  return auth.length > 0 && auth === expected;
}

function grantsExplorer(ev: RcEvent): boolean {
  if (ev.entitlement_ids?.includes(ENTITLEMENT)) {
    return true;
  }
  const pid = `${ev.product_id ?? ''} ${ev.new_product_id ?? ''}`;
  return PRODUCT_FRAGMENTS.some((f) => pid.includes(f));
}

function msToIso(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';
  if (!secret || !verifyAuth(req, secret)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const root = body as Record<string, unknown>;
  const event = (root.event ?? root) as RcEvent;
  const type = event.type ?? '';

  if (type === 'TEST') {
    return new Response(JSON.stringify({ ok: true, ignored: 'TEST' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const appUserId = typeof event.app_user_id === 'string' ? event.app_user_id.trim() : '';
  if (!appUserId || !isUuid(appUserId)) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no_app_user_id' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!grantsExplorer(event)) {
    return new Response(JSON.stringify({ ok: true, skipped: 'not_explorer_product' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIso = new Date().toISOString();

  if (type === 'EXPIRATION') {
    const { error } = await admin
      .from('profiles')
      .update({ plan: 'free', plan_expires_at: null, updated_at: nowIso })
      .eq('id', appUserId);
    if (error) {
      console.error('[revenuecat-webhook] EXPIRATION update failed', error.message);
      return new Response(JSON.stringify({ error: 'db_update_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, type }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (type === 'CANCELLATION') {
    const exp = msToIso(event.expiration_at_ms);
    const { error } = await admin
      .from('profiles')
      .update({
        plan: 'explorer',
        plan_expires_at: exp,
        updated_at: nowIso,
      })
      .eq('id', appUserId);
    if (error) {
      console.error('[revenuecat-webhook] CANCELLATION update failed', error.message);
      return new Response(JSON.stringify({ error: 'db_update_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, type }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const renewTypes = new Set([
    'INITIAL_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'NON_RENEWING_PURCHASE',
    'PRODUCT_CHANGE',
    'SUBSCRIPTION_EXTENDED',
    'TEMPORARY_ENTITLEMENT_GRANT',
  ]);

  if (renewTypes.has(type)) {
    const exp = msToIso(event.expiration_at_ms);
    const { error } = await admin
      .from('profiles')
      .update({
        plan: 'explorer',
        plan_expires_at: exp,
        updated_at: nowIso,
      })
      .eq('id', appUserId);
    if (error) {
      console.error('[revenuecat-webhook] renew update failed', error.message);
      return new Response(JSON.stringify({ error: 'db_update_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, type }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, ignored: type }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
