import modal
from fastapi import Request, Response
import io
import base64
import os
import tempfile
import time
import json
import urllib.request
import urllib.error
import cv2
import numpy as np
import uuid
from gradio_client import Client, handle_file

# تعريف بيئة العمل السحابية الخفيفة المخصصة للبوابة
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "fastapi",
        "pillow",
        "opencv-python-headless",
        "requests",
        "gradio_client"
    )
)

app = modal.App("grido-ai-upscaler")

@app.cls(
    image=image,
    cpu=1.0,
    memory=1024,
    scaledown_window=2,
    timeout=300,
    max_containers=3,
    secrets=[
        modal.Secret.from_name("grido-ai-secret"),
        modal.Secret.from_name("supabase-auth"),
        modal.Secret.from_name("hf-secret")
    ]
)
class ImageEnhancer:
    @modal.enter()
    def load_model(self):
        print("Grido AI Gateway initialized with wisam99/CodeFormer GPU Space.")

    @modal.fastapi_endpoint(method="POST")
    async def enhance(self, request: Request):
        start_time = time.time()
        try:
            # 🛡️ حماية السيرفر عبر توثيق Supabase (Direct JWT Verification)
            SUPABASE_URL = os.environ.get("SUPABASE_URL")
            SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
            HF_TOKEN = os.environ.get("HF_TOKEN")
            
            if not SUPABASE_URL or not SUPABASE_ANON_KEY:
                print("CRITICAL: SUPABASE_URL or SUPABASE_ANON_KEY environment variable is not set!")
                return Response(
                    content='{"error": "خطأ في تهيئة خادم الذكاء الاصطناعي: إعدادات Supabase مفقودة (500)"}',
                    media_type="application/json",
                    status_code=500
                )

            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                print("Unauthorized access attempt blocked! Missing Bearer token.")
                return Response(
                    content='{"error": "طلب غير مصرح به: يتطلب تسجيل الدخول (401 Unauthorized)"}',
                    media_type="application/json",
                    status_code=401
                )
                
            jwt_token = auth_header.replace("Bearer ", "")

            # Verify user token with Supabase directly
            try:
                verify_req = urllib.request.Request(
                    f"{SUPABASE_URL}/auth/v1/user",
                    headers={
                        "Authorization": f"Bearer {jwt_token}",
                        "apikey": SUPABASE_ANON_KEY
                    }
                )
                with urllib.request.urlopen(verify_req, timeout=10) as response:
                    user_data = json.loads(response.read().decode())
                    user_id = user_data.get("id")
                    if not user_id:
                        raise ValueError("User ID missing from Supabase response")
            except Exception as e:
                print(f"Token verification failed: {e}")
                return Response(
                    content='{"error": "طلب غير مصرح به: الجلسة منتهية أو غير صالحة (401)"}',
                    media_type="application/json",
                    status_code=401
                )

            # 🛡️ سقف حجم الدخل قبل قراءة الجسم — جسم ضخم كان يُقرأ كاملاً في RAM قبل أي فحص.
            max_request_bytes = 30 * 1024 * 1024
            content_length = request.headers.get("Content-Length")
            if content_length is not None:
                try:
                    declared_length = int(content_length)
                except (TypeError, ValueError):
                    declared_length = None
                if declared_length is not None and declared_length > max_request_bytes:
                    return Response(
                        content='{"error": "حجم الطلب كبير جداً قبل المعالجة (الحد 30MB)"}',
                        media_type="application/json",
                        status_code=413
                    )

            data = await request.json()
            image_b64 = data.get("image", "")
            daily_limit = data.get("dailyLimit", 2)
            request_id = str(uuid.uuid4())

            if not image_b64:
                return Response(content='{"error": "الصورة غير موجودة"}', media_type="application/json", status_code=400)

            if "," in image_b64:
                image_b64 = image_b64.split(",")[1]

            if len(image_b64) > 20 * 1024 * 1024:
                return Response(content='{"error": "الصورة كبيرة جداً (الحد 20MB)"}', media_type="application/json", status_code=413)

            image_bytes = base64.b64decode(image_b64)
            if len(image_bytes) > 15 * 1024 * 1024:
                del image_bytes
                return Response(content='{"error": "الصورة كبيرة جداً بعد الفك (الحد 15MB)"}', media_type="application/json", status_code=413)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            img_raw = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)
            del image_bytes, np_arr

            if img_raw is None:
                return Response(content='{"error": "فشل قراءة الصورة"}', media_type="application/json", status_code=400)

            h_decoded, w_decoded = img_raw.shape[:2]
            if h_decoded * w_decoded > 64_000_000 or max(h_decoded, w_decoded) > 8192:
                del img_raw
                return Response(
                    content='{"error": "أبعاد الصورة تتجاوز الحد المسموح (64M بكسل أو ضلع > 8192)"}',
                    media_type="application/json",
                    status_code=413
                )

            # 🛡️ حجز ذرّي للحصة اليومية قبل أي معالجة
            try:
                reserve_payload = json.dumps({
                    "p_user_id": user_id,
                    "p_daily_limit": daily_limit,
                    "p_image_bytes": 0,
                    "p_exec_seconds": 0,
                    "p_cost_usd": 0,
                    "p_check_only": False,
                    "p_request_id": request_id,
                    "p_reserve": True
                }).encode('utf-8')
                reserve_req = urllib.request.Request(
                    f"{SUPABASE_URL}/rest/v1/rpc/check_and_record_ai_usage",
                    data=reserve_payload,
                    headers={
                        "Authorization": f"Bearer {jwt_token}",
                        "apikey": SUPABASE_ANON_KEY,
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(reserve_req, timeout=10) as reserve_res:
                    reserve_body = json.loads(reserve_res.read().decode() or "{}")
            except urllib.error.HTTPError as e:
                err_body = e.read().decode()
                print(f"Quota reservation blocked request: {err_body}")
                return Response(
                    content='{"error": "تم الوصول للحد اليومي المسموح به لاستخدام الذكاء الاصطناعي (429 Quota Exceeded)"}',
                    media_type="application/json",
                    status_code=429
                )
            except Exception as e:
                print(f"Quota reservation failed: {e}", flush=True)
                return Response(
                    content='{"error": "تعذر التحقق من الحصة اليومية لاستخدام الذكاء الاصطناعي (خدمة التحقق غير متاحة مؤقتاً)"}',
                    media_type="application/json",
                    status_code=503
                )

            if reserve_body.get("success") is False or reserve_body.get("idempotent") is True:
                print(f"Idempotent replay rejected: {request_id}", flush=True)
                return Response(
                    content='{"error": "طلب مكرر: تمت معالجة هذا الطلب مسبقاً (409 Duplicate)"}',
                    media_type="application/json",
                    status_code=409
                )

            # 🛡️ الكشف عن قناة الشفافية (Alpha Channel) لعزلها والحفاظ عليها لصور العزل والقص
            has_alpha = False
            alpha_mask = None
            if len(img_raw.shape) == 3 and img_raw.shape[2] == 4:
                alpha = img_raw[:, :, 3]
                if np.any(alpha < 254):
                    has_alpha = True
                    alpha_mask = alpha
                img_bgr = img_raw[:, :, :3]
            elif len(img_raw.shape) == 2:
                img_bgr = cv2.cvtColor(img_raw, cv2.COLOR_GRAY2BGR)
            else:
                img_bgr = img_raw[:, :, :3] if len(img_raw.shape) == 3 else img_raw

            h_orig, w_orig = img_bgr.shape[:2]
            max_dim = 1920
            if max(h_orig, w_orig) > max_dim:
                scale = max_dim / float(max(h_orig, w_orig))
                new_w, new_h = int(w_orig * scale), int(h_orig * scale)
                img_bgr = cv2.resize(img_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
                if has_alpha and alpha_mask is not None:
                    alpha_mask = cv2.resize(alpha_mask, (new_w, new_h), interpolation=cv2.INTER_AREA)

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_file:
                tmp_path = tmp_file.name

            cv2.imwrite(tmp_path, img_bgr)

            try:
                # استدعاء السبيس الخاص بك wisam99/CodeFormer على كرت A10G المخصص لحسابك
                hf_client = Client("wisam99/CodeFormer", token=HF_TOKEN)
                result = hf_client.predict(
                    image=handle_file(tmp_path),
                    face_align=True,
                    background_enhance=True,
                    face_upsample=True,
                    upscale=2,
                    codeformer_fidelity=0.90,
                    api_name="/inference"
                )
                output_image_path = result[0]
                restored_img = cv2.imread(output_image_path)
                if restored_img is None:
                    raise Exception("Failed to read restored image from wisam99/CodeFormer")

                # 🌟 الحفاظ على نغمات البشرة الأصلية ولون العيون الطبيعي (90% وضوح وترميم + 10% أصل)
                rh, rw = restored_img.shape[:2]
                orig_scaled = cv2.resize(img_bgr, (rw, rh), interpolation=cv2.INTER_LANCZOS4)
                restored_img = cv2.addWeighted(restored_img, 0.90, orig_scaled, 0.10, 0)
            finally:
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass

            if has_alpha and alpha_mask is not None:
                restored_h, restored_w = restored_img.shape[:2]
                upscaled_alpha = cv2.resize(alpha_mask, (restored_w, restored_h), interpolation=cv2.INTER_LANCZOS4)
                restored_bgra = cv2.merge([
                    restored_img[:, :, 0],
                    restored_img[:, :, 1],
                    restored_img[:, :, 2],
                    upscaled_alpha
                ])
                success, encoded_img = cv2.imencode('.png', restored_bgra, [int(cv2.IMWRITE_PNG_COMPRESSION), 4])
                if not success:
                    raise Exception("فشل تشفير صورة PNG الشفافة الناتجة")
                mime_type = "image/png"
            else:
                success, encoded_img = cv2.imencode('.jpg', restored_img, [int(cv2.IMWRITE_JPEG_QUALITY), 93])
                if not success:
                    raise Exception("فشل تشفير الصورة الناتجة")
                mime_type = "image/jpeg"

            img_str = base64.b64encode(encoded_img.tobytes()).decode("utf-8")
            exec_seconds = round(time.time() - start_time, 2)
            cost_usd = 0.0
            total_cost_usd = 0.0
            
            print(f"Enhancement completed on wisam99/CodeFormer GPU in {exec_seconds}s. Cost: $0.0")

            usage_recorded = False
            try:
                raw_bytes_estimate = int((len(image_b64) * 3) / 4)
                rpc_payload = json.dumps({
                    "p_user_id": user_id,
                    "p_daily_limit": daily_limit,
                    "p_image_bytes": raw_bytes_estimate,
                    "p_exec_seconds": exec_seconds,
                    "p_cost_usd": 0.0,
                    "p_check_only": False,
                    "p_request_id": request_id,
                    "p_reserve": False
                }).encode('utf-8')

                def _post_usage():
                    rpc_req = urllib.request.Request(
                        f"{SUPABASE_URL}/rest/v1/rpc/check_and_record_ai_usage",
                        data=rpc_payload,
                        headers={
                            "Authorization": f"Bearer {jwt_token}",
                            "apikey": SUPABASE_ANON_KEY,
                            "Content-Type": "application/json",
                            "Prefer": "return=minimal"
                        },
                        method="POST"
                    )
                    with urllib.request.urlopen(rpc_req, timeout=15) as record_res:
                        record_res.read()

                try:
                    _post_usage()
                    usage_recorded = True
                except Exception:
                    import time as _retry_sleep
                    _retry_sleep.sleep(1.0)
                    _post_usage()
                    usage_recorded = True
            except urllib.error.HTTPError as e:
                err_body = e.read().decode()
                print(f"RPC Quota error: {err_body}", flush=True)
                return Response(
                    content='{"error": "تم الوصول للحد اليومي المسموح به لاستخدام الذكاء الاصطناعي (429 Quota Exceeded)"}',
                    media_type="application/json",
                    status_code=429
                )
            except Exception as e:
                print(f"CRITICAL: Failed to record usage in Supabase DB: {e}", flush=True)
                usage_recorded = False

            return {
                "success": True,
                "image": f"data:{mime_type};base64,{img_str}",
                "execution_seconds": exec_seconds,
                "cost_usd": cost_usd,
                "total_cost_usd": total_cost_usd,
                "usage_recorded": usage_recorded,
                "request_id": request_id
            }
            
        except Exception as e:
            print("Error during enhancement:", str(e))
            return Response(content='{"error": "فشل ترميم الصورة (500)"}', media_type="application/json", status_code=500)
