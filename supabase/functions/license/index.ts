import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['app://grido', 'https://grido.app', 'http://localhost:5173', 'http://localhost:34115']

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin'
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // معالجة طلبات CORS المسبقة (Pre-flight requests)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // الاتصال بقاعدة بيانات Supabase باستخدام Service Role للتحكم الآمن بالبيانات
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // استخراج توكن تسجيل دخول العميل والتحقق من هويته
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
      return new Response(JSON.stringify({ error: 'Unauthorized token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const path = url.pathname.replace(/\/$/, '') // إزالة الشرطة المائلة الأخيرة

    // 1. تفعيل مفتاح ترخيص: POST /license/activate
    // تم توحيد هذا المنطق ليستخدم دالة activate_license لمنع Race Conditions
    if (req.method === 'POST' && path.endsWith('/activate')) {
      const { key, deviceId } = await req.json()
      
      const { data: profile, error: rpcErr } = await supabaseClient.rpc('activate_license', {
        p_key: key,
        p_device_id: deviceId || 'unknown'
      })

      if (rpcErr) {
        console.error('RPC Activation Error:', rpcErr)
        return new Response(JSON.stringify({ message: rpcErr.message || 'فشل التفعيل: تم استخدام مفتاح الترخيص هذا مسبقاً أو غير صالح' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(profile), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. التحقق من صلاحية الحساب الدوري: GET /license/status
    if (req.method === 'GET' && path.endsWith('/status')) {
      const { data: profile, error: profErr } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profErr || !profile) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // التحقق مما إذا كان الاشتراك منتهي الصلاحية والعودة للخطة المجانية تلقائياً
      if (profile.plan !== 'free' && profile.expires_at) {
        const expires = new Date(profile.expires_at)
        if (new Date() > expires) {
          const { data: updatedProfile } = await supabaseClient
            .from('profiles')
            .update({ 
              plan: 'free', 
              status: 'expired', 
              updated_at: new Date().toISOString() 
            })
            .eq('id', user.id)
            .select()
            .single()

          return new Response(JSON.stringify(updatedProfile), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      return new Response(JSON.stringify(profile), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('License function error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
        'Content-Type': 'application/json' 
      },
    })
  }
})
