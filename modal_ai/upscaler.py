import modal
from fastapi import Request, Response
import io
import base64
import os

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

# تعريف بيئة العمل مع تثبيت requests وجميع التبعيات
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
        "requests" # 🌟 إضافة requests لتنزيل الأوزان
    )
    .run_commands(
        "pip install --no-deps gfpgan",
        "pip install --no-deps basicsr"
    )
)

app = modal.App("grido-ai-upscaler")

@app.cls(image=image, gpu="A10G", scaledown_window=2) # الإغلاق الفوري الفعلي بعد ثانيتين من انتهاء الطلب (scaledown_window=2)
class ImageEnhancer:
    @modal.enter()
    def load_model(self):
        print("جاري تحميل نموذج ترميم الوجوه GFPGAN v1.4...")
        import sys
        import torchvision.transforms.functional as functional
        # إصلاح التوافقية بين torchvision ومكتبة basicsr/gfpgan
        sys.modules['torchvision.transforms.functional_tensor'] = functional

        import torch
        from gfpgan import GFPGANer
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # نموذج GFPGAN v1.4 المتخصص في توضيح وترميم الوجوه مع الحفاظ الدقيق على الشبه 100%
        self.restorer = GFPGANer(
            model_path='https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth',
            upscale=2,
            arch='clean',
            channel_multiplier=2,
            bg_upsampler=None,
            device=self.device
        )
        print("تم تحميل نموذج GFPGAN v1.4 بنجاح!")

    @modal.fastapi_endpoint(method="POST")
    async def enhance(self, request: Request):
        import torch
        import time
        start_time = time.time()
        try:
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

            # 🌟 إجراء عملية ترميم الوجوه وتوضيح العيون والبشرة مع الحفاظ على الشبه 100%
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
            
            print(f"Enhance completed in {exec_seconds}s. Process Cost: ${cost_usd}, Total Cost (with 2s idle): ${total_cost_usd}")

            return {
                "success": True,
                "image": f"data:image/png;base64,{img_str}",
                "execution_seconds": exec_seconds,
                "cost_usd": cost_usd,
                "total_cost_usd": total_cost_usd
            }
            
        except Exception as e:
            print("Error during GFPGAN enhancement:", str(e))
            return Response(content=f'{{"error": "{str(e)}"}}', media_type="application/json", status_code=500)
        finally:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
