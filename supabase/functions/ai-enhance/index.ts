import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['app://grido', 'https://grido.app', 'http://localhost:5173', 'http://localhost:34115']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB limit

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin'
  }
}

const PLAN_DAILY_LIMITS: Record<string, number> = {
  free: 3,
  pro: 25,
  enterprise: 100
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user profile & plan
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan, status')
      .eq('id', user.id)
      .single()

    const userPlan = profile?.plan || 'free'
    const dailyLimit = PLAN_DAILY_LIMITS[userPlan] || PLAN_DAILY_LIMITS.free

    const body = await req.json()
    const imageB64 = body.image

    if (!imageB64 || typeof imageB64 !== 'string') {
      return new Response(JSON.stringify({ error: 'الصورة غير موجودة أو الحقل غير صحيح' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rawBytesEstimate = Math.ceil((imageB64.length * 3) / 4)
    if (rawBytesEstimate > MAX_IMAGE_BYTES) {
      return new Response(JSON.stringify({ error: 'حجم الصورة يتجاوز الحد المسموح به (10 ميجابايت)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const secretKey = Deno.env.get('GRIDO_AI_SECRET_KEY')
    const modalUrl = Deno.env.get('MODAL_AI_URL') || 'https://grido-ai-upscaler--imageenhancer-enhance.modal.run'

    if (!secretKey) {
      console.error('CRITICAL: GRIDO_AI_SECRET_KEY is missing on server environment!')
      return new Response(JSON.stringify({ error: 'خطأ في إعدادات خادم الذكاء الاصطناعي' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call Modal AI Endpoint securely with X-Grido-Api-Key
    const modalRes = await fetch(modalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Grido-Api-Key': secretKey
      },
      body: JSON.stringify({ image: imageB64 })
    })

    const modalData = await modalRes.json()

    if (!modalRes.ok || modalData.error) {
      return new Response(JSON.stringify({ error: modalData.error || 'فشل معالجة الصورة في خادم AI' }), {
        status: modalRes.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Record usage atomically via database RPC
    const { error: rpcErr } = await supabaseClient.rpc('check_and_record_ai_usage', {
      p_user_id: user.id,
      p_daily_limit: dailyLimit,
      p_image_bytes: rawBytesEstimate,
      p_exec_seconds: modalData.execution_seconds || 0,
      p_cost_usd: modalData.total_cost_usd || 0
    })

    if (rpcErr) {
      console.error('AI Quota RPC error:', rpcErr)
      return new Response(JSON.stringify({ error: rpcErr.message || 'تم الوصول للحد اليومي لاستخدام الذكاء الاصطناعي' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(modalData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('ai-enhance edge function error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
