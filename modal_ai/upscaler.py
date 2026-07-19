import modal
from fastapi import Request, Response
import io
import base64
import os

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

def download_models():
    """تنزيل مسبق لجميع ملفات الأوزان أثناء مرحلة بناء الـ Image لعدم استهلاك أي ثانية على الـ GPU أثناء التشغيل"""
    import urllib.request
    import os

    urls = [
        ("https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth", "/usr/local/lib/python3.10/site-packages/gfpgan/weights/GFPGANv1.4.pth"),
        ("https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth", "/root/gfpgan/weights/detection_Resnet50_Final.pth"),
        ("https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth", "/root/gfpgan/weights/parsing_parsenet.pth"),
        ("https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth", "/root/.cache/realesrgan/RealESRGAN_x2plus.pth"),
    ]

    for url, path in urls:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path):
            print(f"Pre-baking weight file during build: {url} -> {path}")
            urllib.request.urlretrieve(url, path)

# تعريف بيئة العمل المحشوة بالأوزان مسبقاً (Pre-baked Weights Docker Image)
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("libgl1-mesa-glx", "libglib2.0-0", "git")
    .pip_install(
        "torch",
        "torchvision",
        "pillow",
        "fastapi",
        "opencv-python-headless",
        "facexlib",
        "lmdb",
        "pyyaml",
        "scipy",
        "tb-nightly",
        "yapf",
        "requests"
    )
    .run_commands(
        "pip install --no-deps gfpgan",
        "pip install --no-deps basicsr",
        "pip install --no-deps realesrgan"
    )
    .run_function(download_models) # 🌟 تنزيل الأوزان مسبقاً داخل القرص المحلي لـ Image لصفر وقت تنزيل على الـ GPU
)

app = modal.App("grido-ai-upscaler")

@app.cls(image=image, gpu="A10G", scaledown_window=2) # الإغلاق الفوري الفعلي بعد ثانيتين من انتهاء الطلب (scaledown_window=2)
class ImageEnhancer:
    @modal.enter()
    def load_model(self):
        print("جاري تحميل النموذج المزدوج من القرص المحلي المسبق التخزين...")
        import sys
        import torchvision.transforms.functional as functional
        # إصلاح التوافقية بين torchvision ومكتبة basicsr/gfpgan
        sys.modules['torchvision.transforms.functional_tensor'] = functional

        import torch
        from gfpgan import GFPGANer
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # 1. إعداد نموذج Real-ESRGAN x2plus محلياً من القرص
        bg_model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2)
        bg_upsampler = RealESRGANer(
            scale=2,
            model_path='/root/.cache/realesrgan/RealESRGAN_x2plus.pth',
            model=bg_model,
            tile=400,
            tile_pad=10,
            pre_pad=0,
            half=True if torch.cuda.is_available() else False,
            device=self.device
        )

        # 2. إعداد نموذج GFPGAN v1.4 محلياً من القرص
        self.restorer = GFPGANer(
            model_path='/usr/local/lib/python3.10/site-packages/gfpgan/weights/GFPGANv1.4.pth',
            upscale=2,
            arch='clean',
 channel_multiplier=2,
            bg_upsampler=bg_upsampler,
            device=self.device
        )
        print("تم تحميل النموذج المزدوج فورياً وبأعلى سرعة!")

    @modal.fastapi_endpoint(method="POST")
    async def enhance(self, request: Request):
        import torch
        import time
        start_time = time.time()
        try:
            # 🛡️ حماية السيرفر الـ API عبر مفتاح التوثيق السري (Secret Key Protection)
            GRIDO_SECRET_KEY = os.environ.get("GRIDO_AI_SECRET_KEY", "grido_sec_ai_v1_98234791283749")
            incoming_key = request.headers.get("X-Grido-Api-Key", "") or request.headers.get("x-grido-api-key", "")
            
            if incoming_key != GRIDO_SECRET_KEY:
                print("Unauthorized access attempt blocked!")
                return Response(
                    content='{"error": "طلب غير مصرح به: يتطلب مفتاح توثيق Grido Studio (401 Unauthorized)"}',
                    media_type="application/json",
                    status_code=401
                )

            import cv2
            import numpy as np
            
            data = await request.json()
            image_b64 = data.get("image", "")
            
            if not image_b64:
                return Response(content='{"error": "الصورة غير موجودة"}', media_type="application/json", status_code=400)

            if "," in image_b64:
                image_b64 = image_b64.split(",")[1]
                
            image_bytes = base64.b64decode(image_b64)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if img_bgr is None:
                return Response(content='{"error": "فشل قراءة الصورة"}', media_type="application/json", status_code=400)

            # 🌟 إجراء معالجة فائقة المزدوجة (ترميم الوجوه بالـ GFPGAN v1.4 وتوضيح الخلفية والملابس بالـ Real-ESRGAN)
            _, _, restored_img = self.restorer.enhance(
                img_bgr,
                has_aligned=False,
                only_center_face=False,
                paste_back=True
            )
            
            # تحويل النتيجة من BGR إلى PNG Base64
            success, encoded_img = cv2.imencode('.png', restored_img)
            if not success:
                raise Exception("فشل تشفير الصورة الناتجة")
                
            img_str = base64.b64encode(encoded_img.tobytes()).decode("utf-8")
            
            # حساب تكلفة المعالجة بالدولار لكرت A10G (سعر الساعة $1.10 = $0.0003055/ثانية)
            exec_seconds = round(time.time() - start_time, 2)
            cost_usd = round(exec_seconds * (1.10 / 3600), 6)
            total_cost_usd = round((exec_seconds + 2) * (1.10 / 3600), 6) # شاملة ثانيتي الإغلاق الإضافيتين
            
            print(f"Dual Enhancement (GFPGAN + Real-ESRGAN) completed in {exec_seconds}s. Process Cost: ${cost_usd}, Total Cost (with 2s idle): ${total_cost_usd}")

            return {
                "success": True,
                "image": f"data:image/png;base64,{img_str}",
                "execution_seconds": exec_seconds,
                "cost_usd": cost_usd,
                "total_cost_usd": total_cost_usd
            }
            
        except Exception as e:
            print("Error during Dual enhancement:", str(e))
            return Response(content=f'{{"error": "{str(e)}"}}', media_type="application/json", status_code=500)
        finally:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
