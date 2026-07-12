import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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
    if (req.method === 'POST' && path.endsWith('/activate')) {
      const { key } = await req.json()
      
      // جلب المفتاح والتحقق من كونه غير مستخدم
      const { data: licenseKey, error: keyErr } = await supabaseClient
        .from('license_keys')
        .select('*')
        .eq('key', key)
        .eq('status', 'unused')
        .single()

      if (keyErr || !licenseKey) {
        return new Response(JSON.stringify({ message: 'مفتاح الترخيص غير صالح أو تم استخدامه مسبقاً' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // حساب تاريخ الانتهاء بناءً على عدد الأشهر المحددة بالترخيص
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + licenseKey.duration_months)

      // تحديث حالة المفتاح إلى مستخدم وربطه بالمستخدم الحالي بشرط أن يكون ما زال غير مستخدم لمنع السباق البرمجي
      const { data: updatedKeys, error: updateErr } = await supabaseClient
        .from('license_keys')
        .update({ 
          status: 'used', 
          user_id: user.id, 
          activated_at: new Date().toISOString() 
        })
        .eq('key', key)
        .eq('status', 'unused')
        .select()

      if (updateErr || !updatedKeys || updatedKeys.length === 0) {
        return new Response(JSON.stringify({ message: 'فشل التفعيل: تم استخدام مفتاح الترخيص هذا مسبقاً أو غير صالح' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ترقية الحساب الشخصي للمستخدم لباقة الترخيص المقررة
      const { data: profile, error: profErr } = await supabaseClient
        .from('profiles')
        .update({
          plan: licenseKey.plan.toLowerCase(),
          status: 'active',
          expires_at: expiresAt.toISOString(),
          license_key: key,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (profErr) {
        return new Response(JSON.stringify({ error: 'Failed to update user profile' }), {
          status: 500,
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

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
