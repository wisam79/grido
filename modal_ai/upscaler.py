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
        ("https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/codeformer.pth", "/root/CodeFormer/weights/CodeFormer/codeformer.pth"),
        ("https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth", "/root/CodeFormer/weights/facelib/detection_Resnet50_Final.pth"),
        ("https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth", "/root/CodeFormer/weights/facelib/parsing_parsenet.pth"),
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
        "pip install --no-deps basicsr",
        "pip install --no-deps realesrgan",
        "git clone https://github.com/sczhou/CodeFormer.git /root/CodeFormer",
        # تطعيم حزمة basicsr بمعماريات CodeFormer ودوال misc مباشرة على القرص
        "python -c \"import sys, os, shutil, torchvision.transforms.functional as f; sys.modules['torchvision.transforms.functional_tensor'] = f; import basicsr; b_path = os.path.dirname(basicsr.__file__); shutil.copy('/root/CodeFormer/basicsr/archs/vqgan_arch.py', os.path.join(b_path, 'archs', 'vqgan_arch.py')); shutil.copy('/root/CodeFormer/basicsr/archs/codeformer_arch.py', os.path.join(b_path, 'archs', 'codeformer_arch.py')); open(os.path.join(b_path, 'utils', 'misc.py'), 'a').write('\\ndef get_device(gpu_id=None):\\n    import torch\\n    return torch.device(\\\"cuda\\\" if torch.cuda.is_available() else \\\"cpu\\\")\\ndef gpu_is_available():\\n    import torch\\n    return torch.cuda.is_available()\\n')\""
    )
    .run_function(download_models) # 🌟 تنزيل الأوزان مسبقاً داخل القرص المحلي لـ Image لصفر وقت تنزيل على الـ GPU
)

app = modal.App("grido-ai-upscaler")

@app.cls(
    image=image,
    gpu="A10G",
    scaledown_window=2,
    secrets=[modal.Secret.from_name("grido-ai-secret")]
)
class ImageEnhancer:
    @modal.enter()
    def load_model(self):
        print("جاري تحميل النموذج المزدوج من القرص المحلي المسبق التخزين...")
        import sys
        import torchvision.transforms.functional as functional
        # إصلاح التوافقية بين torchvision ومكتبة basicsr/gfpgan
        sys.modules['torchvision.transforms.functional_tensor'] = functional
        
        import torch
        def get_device(gpu_id=None):
            if gpu_id is None:
                gpu_str = ''
            elif isinstance(gpu_id, int):
                gpu_str = f':{gpu_id}'
            else:
                gpu_str = ''
            return torch.device('cuda' + gpu_str if torch.cuda.is_available() else 'cpu')

        def gpu_is_available():
            return torch.cuda.is_available()

        import basicsr.utils.misc as misc_mod
        misc_mod.get_device = get_device
        misc_mod.gpu_is_available = gpu_is_available
        import basicsr.utils as utils_mod
        utils_mod.get_device = get_device
        utils_mod.gpu_is_available = gpu_is_available

        if '/root/CodeFormer' not in sys.path:
            sys.path.append('/root/CodeFormer')

        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer
        from basicsr.utils.registry import ARCH_REGISTRY

        # تسجيل بنية CodeFormer في الـ Registry عبر الاستيراد المباشر
        import basicsr.archs.codeformer_arch  # noqa: F401
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # 1. إعداد نموذج Real-ESRGAN x2plus محلياً من القرص
        bg_model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2)
        self.bg_upsampler = RealESRGANer(
            scale=2,
            model_path='/root/.cache/realesrgan/RealESRGAN_x2plus.pth',
            model=bg_model,
            tile=400,
            tile_pad=10,
            pre_pad=0,
            half=True if torch.cuda.is_available() else False,
            device=self.device
        )

        # 2. إعداد نموذج CodeFormer محلياً من القرص
        self.net = ARCH_REGISTRY.get('CodeFormer')(dim_embd=512, codebook_size=1024, n_head=8, n_layers=9, 
                                                connect_list=['32', '64', '128', '256']).to(self.device)
        checkpoint = torch.load('/root/CodeFormer/weights/CodeFormer/codeformer.pth')['params_ema']
        self.net.load_state_dict(checkpoint)
        self.net.eval()

        print("تم تحميل النموذج المزدوج فورياً وبأعلى سرعة!")

    @modal.fastapi_endpoint(method="POST")
    async def enhance(self, request: Request):
        import torch
        import time
        start_time = time.time()
        try:
            # 🛡️ حماية السيرفر الـ API عبر مفتاح التوثيق السري (Secret Key Protection)
            GRIDO_SECRET_KEY = os.environ.get("GRIDO_AI_SECRET_KEY")
            if not GRIDO_SECRET_KEY:
                print("CRITICAL: GRIDO_AI_SECRET_KEY environment variable is not set!")
                return Response(
                    content='{"error": "خطأ في تهيئة خادم الذكاء الاصطناعي: المفتاح غير معرّف (500 Internal Server Error)"}',
                    media_type="application/json",
                    status_code=500
                )

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

            # 🌟 إجراء معالجة فائقة المزدوجة (ترميم الوجوه بالـ CodeFormer وتوضيح الخلفية والملابس بالـ Real-ESRGAN)
            import sys
            if '/root/CodeFormer' not in sys.path:
                sys.path.append('/root/CodeFormer')
            from facelib.utils.face_restoration_helper import FaceRestoreHelper
            from basicsr.utils import img2tensor, tensor2img
            from torchvision.transforms.functional import normalize
            
            face_helper = FaceRestoreHelper(
                2, face_size=512, crop_ratio=(1, 1), 
                det_model='retinaface_resnet50', save_ext='png', 
                use_parse=True, device=self.device
            )
            
            face_helper.read_image(img_bgr)
            face_helper.get_face_landmarks_5(only_center_face=False, resize=640, eye_dist_threshold=5)
            face_helper.align_warp_face()

            w = 0.7 # Fidelity weight (0.7 for maximum fidelity to original image features)

            for idx, cropped_face in enumerate(face_helper.cropped_faces):
                # 🌟 إصلاح الإضاءة وإزالة الظلال باستخدام CLAHE
                lab = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                cl = clahe.apply(l)
                limg = cv2.merge((cl, a, b))
                fixed_cropped_face = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

                cropped_face_t = img2tensor(fixed_cropped_face / 255., bgr2rgb=True, float32=True)
                normalize(cropped_face_t, (0.5, 0.5, 0.5), (0.5, 0.5, 0.5), inplace=True)
                cropped_face_t = cropped_face_t.unsqueeze(0).to(self.device)

                try:
                    with torch.no_grad():
                        output = self.net(cropped_face_t, w=w, adain=True)[0]
                        restored_face = tensor2img(output, rgb2bgr=True, min_max=(-1, 1))
                    del output
                except Exception as error:
                    print(f'\tFailed inference for CodeFormer: {error}')
                    restored_face = tensor2img(cropped_face_t, rgb2bgr=True, min_max=(-1, 1))

                restored_face = restored_face.astype('uint8')
                face_helper.add_restored_face(restored_face, cropped_face)

            # upsample the background using FP16 Autocast for speed and VRAM savings
            with torch.autocast(device_type='cuda', dtype=torch.float16):
                bg_img = self.bg_upsampler.enhance(img_bgr, outscale=2)[0]
            face_helper.get_inverse_affine(None)
            restored_img = face_helper.paste_faces_to_input_image(upsample_img=bg_img)
            
            # تحويل النتيجة من BGR إلى PNG Base64
            success, encoded_img = cv2.imencode('.png', restored_img)
            if not success:
                raise Exception("فشل تشفير الصورة الناتجة")
                
            img_str = base64.b64encode(encoded_img.tobytes()).decode("utf-8")
            
            # حساب تكلفة المعالجة بالدولار لكرت A10G (سعر الساعة $1.10 = $0.0003055/ثانية)
            exec_seconds = round(time.time() - start_time, 2)
            cost_usd = round(exec_seconds * (1.10 / 3600), 6)
            total_cost_usd = round((exec_seconds + 2) * (1.10 / 3600), 6) # شاملة ثانيتي الإغلاق الإضافيتين
            
            print(f"Dual Enhancement (CodeFormer + Real-ESRGAN) completed in {exec_seconds}s. Process Cost: ${cost_usd}, Total Cost: ${total_cost_usd}")

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
