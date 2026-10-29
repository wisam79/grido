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

def download_models():
    """تنزيل مسبق لنماذج YuNet و CodeFormer ONNX فائقة السرعة أثناء بناء صورة الحاوية لتعمل ذاتياً 100% على الـ CPU دون أي مزود خارجي"""
    import os
    import urllib.request

    yunet_path = "/root/yunet.onnx"
    if not os.path.exists(yunet_path):
        print("Pre-baking yunet.onnx during image build...")
        yunet_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
        urllib.request.urlretrieve(yunet_url, yunet_path)
        print("yunet.onnx cached successfully, size:", os.path.getsize(yunet_path))

    codeformer_path = "/root/codeformer.onnx"
    if not os.path.exists(codeformer_path):
        print("Pre-baking codeformer.onnx during image build...")
        cf_url = "https://huggingface.co/facefusion/models-3.0.0/resolve/main/codeformer.onnx"
        urllib.request.urlretrieve(cf_url, codeformer_path)
        print("codeformer.onnx cached successfully, size:", os.path.getsize(codeformer_path))

# تعريف بيئة العمل السحابية الخفيفة المستقلة 100% والمشغلة على معالج CPU دون بطاقات GPU أو اعتمادات خارجية
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "fastapi",
        "pillow",
        "opencv-python-headless",
        "onnxruntime",
        "numpy",
        "requests"
    )
    .run_function(download_models)
)

app = modal.App("grido-ai-upscaler")

@app.cls(
    image=image,
    cpu=4.0,
    memory=2048,
    scaledown_window=5,
    timeout=300,
    max_containers=3,
    secrets=[
        modal.Secret.from_name("grido-ai-secret"),
        modal.Secret.from_name("supabase-auth")
    ]
)
class ImageEnhancer:
    @modal.enter()
    def load_model(self):
        import onnxruntime as ort
        print("Initializing YuNet and CodeFormer ONNX runtime on CPU...")
        self.yunet_path = "/root/yunet.onnx"
        self.codeformer_path = "/root/codeformer.onnx"

        # ArcFace / RetinaFace 5 canonical landmarks for standard 512x512 face space
        self.standard_5landmarks = np.array([
            [192.98138, 239.94708],
            [318.90277, 240.1736],
            [256.0102, 314.01935],
            [201.26117, 371.41043],
            [313.08905, 371.15118]
        ], dtype=np.float32)

        # Pre-create soft elliptical blending mask
        mask = np.zeros((512, 512), dtype=np.float32)
        cv2.ellipse(mask, (256, 270), (160, 200), 0, 0, 360, 1.0, -1)
        mask = cv2.GaussianBlur(mask, (51, 51), 0)
        self.mask_3ch = np.stack([mask] * 3, axis=2)

        # Initialize ONNX Runtime session for CodeFormer
        so = ort.SessionOptions()
        so.intra_op_num_threads = 4
        so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        self.session = ort.InferenceSession(self.codeformer_path, so)
        inputs = self.session.get_inputs()
        self.input_name0 = inputs[0].name
        self.input_name1 = inputs[1].name
        print("YuNet & CodeFormer ONNX loaded successfully into memory on CPU!")

    @modal.fastapi_endpoint(method="POST")
    async def enhance(self, request: Request):
        start_time = time.time()
        try:
            # 🛡️ حماية السيرفر عبر توثيق Supabase (Direct JWT Verification)
            SUPABASE_URL = os.environ.get("SUPABASE_URL")
            SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

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

            # 🛡️ سقف حجم الدخل قبل قراءة الجسم — جسم ضخم كان يُقرأ كاملاً في RAM قبل أي فحص
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
            try:
                fidelity = float(data.get("fidelity", 0.78))
                fidelity = max(0.1, min(1.0, fidelity))
            except (ValueError, TypeError):
                fidelity = 0.78
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
                h_orig, w_orig = img_bgr.shape[:2]

            # 🎯 كشف الوجه ومحاذاة الملامح الخمسة بدقة فائقة عبر YuNet
            detector = cv2.FaceDetectorYN.create(self.yunet_path, "", (w_orig, h_orig))
            _, faces = detector.detect(img_bgr)

            restored_img = img_bgr.copy()

            if faces is not None and len(faces) > 0:
                print(f"YuNet detected {len(faces)} face(s). Proceeding with CodeFormer ONNX restoration on CPU...")
                for face in faces:
                    score = face[14]
                    if score < 0.4:
                        continue

                    # استخراج النقاط الخمس: العينين، طرف الأنف، زاويتي الفم
                    landmarks = face[4:14].reshape(5, 2).astype(np.float32)

                    # محاذاة جزئية دقيقة لمطابقة مساحة تدريب CodeFormer (512x512)
                    M, _ = cv2.estimateAffinePartial2D(landmarks, self.standard_5landmarks)
                    if M is None:
                        continue

                    cropped_face = cv2.warpAffine(img_bgr, M, (512, 512), borderMode=cv2.BORDER_REFLECT)

                    # تجهيز المدخل لـ CodeFormer ONNX
                    face_rgb = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2RGB)
                    face_norm = (face_rgb.astype(np.float32) / 255.0 - 0.5) / 0.5
                    input_tensor = np.expand_dims(face_norm.transpose(2, 0, 1), axis=0).astype(np.float32)

                    # تشغيل النموذج على المعالج CPU مع fidelity المحسوبة (افتراضياً 0.78 لتوضيح معالم الوجه بحدة طبيعية فائقة)
                    output = self.session.run(
                        None,
                        {
                            self.input_name0: input_tensor,
                            self.input_name1: np.array([fidelity], dtype=np.double)
                        }
                    )[0]

                    tensor = output[0].clip(-1, 1)
                    tensor = (tensor - (-1)) / (1 - (-1))
                    restored_face = (tensor.transpose(1, 2, 0) * 255.0).round().astype(np.uint8)
                    restored_face = cv2.cvtColor(restored_face, cv2.COLOR_RGB2BGR)

                    # مزج 85% من الوجه المرمم مع 15% من الوجه الأصلي للحفاظ على تفاصيل ومسامات البشرة الحقيقية ولون العيون الأصلي
                    restored_face = cv2.addWeighted(restored_face, 0.85, cropped_face, 0.15, 0)

                    # إعادة الوجه المرمم إلى إحداثياته الأصلية في الصورة الكاملة عبر التحويل الهندسي المعكوس (Inverse Affine)
                    M_inv = cv2.invertAffineTransform(M)
                    restored_warped = cv2.warpAffine(restored_face, M_inv, (w_orig, h_orig), borderMode=cv2.BORDER_REFLECT)
                    mask_warped = cv2.warpAffine(self.mask_3ch, M_inv, (w_orig, h_orig), borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))

                    # دمج ناعم وخفي تماماً بدون أي حواف قاطعة
                    restored_img = (restored_warped * mask_warped + restored_img * (1.0 - mask_warped)).astype(np.uint8)
            else:
                print("No face detected by YuNet; returning original image gracefully.")

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

            print(f"Self-hosted CPU Enhancement completed in {exec_seconds}s. Cost: $0.0")

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
