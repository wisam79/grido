import asyncio
import base64
import binascii
import hashlib
import json
import logging
import os
import time
import urllib.error
import urllib.request
import uuid

import cv2
from fastapi import Request, Response
import modal
import numpy as np

OUTPUT_SCALE = 2
MAX_REQUEST_BYTES = 30 * 1024 * 1024
MAX_INPUT_SIDE = 2048
MAX_INPUT_PIXELS = MAX_INPUT_SIDE ** 2
# 🛡️ Decompression bomb protection: reject oversized images inside OpenCV decoder before RAM allocation
os.environ["OPENCV_IO_MAX_IMAGE_PIXELS"] = str(MAX_INPUT_PIXELS)
MAX_RESPONSE_BYTES = 50 * 1024 * 1024
MAX_ENCODED_BYTES = 3 * ((MAX_RESPONSE_BYTES - 4096) // 4)
TILE_SIZE = 512
TILE_HALO = 36
MODEL_FILES = {
    "yunet.onnx": (
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/48b10fa505aeb51fbd127fc60a5c660040e823b7/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        232589,
        "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4",
    ),
    "codeformer.onnx": (
        "https://huggingface.co/facefusion/models-3.0.0/resolve/728b9659bd9691bf32cbf7f61af478d94b7ba81e/codeformer.onnx",
        376951650,
        "21710e7ab61c82683576c428e9c1b6fe1ed419586b7b39e394c3449c294b550f",
    ),
}


def json_error(message: str, status_code: int, code: str = "error") -> Response:
    """Unified error response helper returning consistent JSON payloads."""
    payload = json.dumps({"error": message, "code": code}, ensure_ascii=False)
    return Response(content=payload, media_type="application/json", status_code=status_code)


def download_models(model_dir="/root"):
    """Cache immutable, hash-verified models during the container build."""
    os.makedirs(model_dir, exist_ok=True)
    for name, (url, expected_size, expected_hash) in MODEL_FILES.items():
        path = os.path.join(model_dir, name)
        if os.path.isfile(path):
            with open(path, "rb") as cached:
                digest = hashlib.file_digest(cached, "sha256").hexdigest() if hasattr(hashlib, "file_digest") else _file_hash(cached)
            if os.path.getsize(path) == expected_size and digest == expected_hash:
                continue
            raise ValueError(f"Cached model integrity check failed: {name}")
        temporary = path + ".tmp"
        try:
            digest = hashlib.sha256()
            size = 0
            with urllib.request.urlopen(url, timeout=120) as source, open(temporary, "wb") as target:
                while chunk := source.read(1024 * 1024):
                    size += len(chunk)
                    if size > expected_size:
                        raise ValueError(f"Model exceeds declared size: {name}")
                    digest.update(chunk)
                    target.write(chunk)
                target.flush()
                os.fsync(target.fileno())
            if size != expected_size or digest.hexdigest() != expected_hash:
                raise ValueError(f"Downloaded model integrity check failed: {name}")
            os.replace(temporary, path)
            print(f"Cached {name}: {size} bytes", flush=True)
        finally:
            if os.path.exists(temporary):
                os.remove(temporary)


def _file_hash(source):
    digest = hashlib.sha256()
    while chunk := source.read(1024 * 1024):
        digest.update(chunk)
    return digest.hexdigest()


def output_affine(matrix, scale=OUTPUT_SCALE):
    """Map aligned-face pixel centers onto the resized full-image grid."""
    inverse = cv2.invertAffineTransform(matrix).astype(np.float64)
    inverse *= scale
    # OpenCV resize maps source center x to scale*x + (scale-1)/2.
    inverse[:, 2] += (scale - 1) / 2.0
    return inverse


def create_face_mask():
    mask = np.zeros((512, 512), dtype=np.float32)
    cv2.ellipse(mask, (256, 258), (190, 228), 0, 0, 360, 1.0, -1)
    mask = cv2.GaussianBlur(mask, (0, 0), 18)
    # Fade to zero before the aligned crop ends, including the neck/collar edge.
    edge = np.minimum(np.arange(512), np.arange(512)[::-1]) / 32.0
    edge = np.clip(edge, 0, 1).astype(np.float32)
    edge = edge * edge * (3 - 2 * edge)
    mask *= edge[:, None] * edge[None, :]
    return mask


def split_image(img_raw):
    alpha = img_raw[:, :, 3].copy() if img_raw.ndim == 3 and img_raw.shape[2] == 4 else None
    if img_raw.dtype == np.uint16:
        img_raw = ((img_raw.astype(np.uint32) + 128) // 257).astype(np.uint8)
    if img_raw.dtype != np.uint8:
        raise ValueError("Unsupported image bit depth")
    if img_raw.ndim == 2:
        return cv2.cvtColor(img_raw, cv2.COLOR_GRAY2BGR), None
    if img_raw.shape[2] == 4:
        return np.ascontiguousarray(img_raw[:, :, :3]), alpha
    if img_raw.shape[2] == 3:
        return img_raw, None
    raise ValueError("Unsupported image channels")


def encode_output(img_bgr, alpha):
    if alpha is not None:
        height, width = img_bgr.shape[:2]
        resized_alpha = cv2.resize(alpha, (width, height), interpolation=cv2.INTER_LINEAR)
        image = cv2.merge((*cv2.split(img_bgr.astype(np.uint16) * 257 if alpha.dtype == np.uint16 else img_bgr), resized_alpha))
        success, encoded = cv2.imencode(".png", image, [cv2.IMWRITE_PNG_COMPRESSION, 4])
        mime = "image/png"
    else:
        parameters = [cv2.IMWRITE_JPEG_QUALITY, 98]
        if hasattr(cv2, "IMWRITE_JPEG_SAMPLING_FACTOR"):
            parameters += [cv2.IMWRITE_JPEG_SAMPLING_FACTOR, cv2.IMWRITE_JPEG_SAMPLING_FACTOR_444]
        success, encoded = cv2.imencode(".jpg", img_bgr, parameters)
        mime = "image/jpeg"
    if not success:
        raise RuntimeError("Output encoding failed")
    if encoded.nbytes > MAX_ENCODED_BYTES:
        raise ValueError("Encoded output exceeds desktop response budget")
    return encoded, mime


class StudioPipeline:
    def load_sessions(self, model_dir="/root", threads=2):
        import onnxruntime as ort
        cv2.setNumThreads(threads)
        options = ort.SessionOptions()
        options.intra_op_num_threads = threads
        options.inter_op_num_threads = 1
        options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        options.add_session_config_entry("session.intra_op.allow_spinning", "0")
        self.session = ort.InferenceSession(os.path.join(model_dir, "codeformer.onnx"), options, providers=["CPUExecutionProvider"])
        inputs = self.session.get_inputs()
        self.face_input = next(item for item in inputs if len(item.shape) == 4)
        self.weight_input = next(item for item in inputs if item is not self.face_input)
        if self.face_input.type != "tensor(float)" or self.weight_input.type not in ("tensor(double)", "tensor(float)"):
            raise ValueError("Unexpected CodeFormer input contract")
        self.detector = cv2.FaceDetectorYN.create(os.path.join(model_dir, "yunet.onnx"), "", (640, 640), 0.7, 0.3, 5000)
        self.standard_5landmarks = np.array([
            [192.98138, 239.94708], [318.90277, 240.1736],
            [256.0102, 314.01935], [201.26117, 371.41043],
            [313.08905, 371.15118],
        ], dtype=np.float32)
        self.face_mask = create_face_mask()

    def detect_faces(self, img_bgr):
        height, width = img_bgr.shape[:2]
        scale = min(1.0, 640.0 / max(height, width))
        detect_w, detect_h = max(1, round(width * scale)), max(1, round(height * scale))
        small = cv2.resize(img_bgr, (detect_w, detect_h), interpolation=cv2.INTER_AREA) if scale < 1 else img_bgr
        padded = np.zeros((640, 640, 3), dtype=np.uint8)
        padded[:detect_h, :detect_w] = small
        _, faces = self.detector.detect(padded)
        if faces is None:
            return []
        faces = faces.copy()
        # Undo actual rounded resize, not its nominal ratio.
        sx, sy = detect_w / width, detect_h / height
        faces[:, [0, 4, 6, 8, 10, 12]] = (faces[:, [0, 4, 6, 8, 10, 12]] + .5) / sx - .5
        faces[:, [1, 5, 7, 9, 11, 13]] = (faces[:, [1, 5, 7, 9, 11, 13]] + .5) / sy - .5
        faces[:, 2] /= sx
        faces[:, 3] /= sy
        return [face for face in faces if 0 <= face[8] < width and 0 <= face[9] < height]

    def upscale_background_neural(self, img_bgr, tile_size=TILE_SIZE):
        """Heavy deep CNN background upscaler (preserved for GPU or offline batch jobs)."""
        if not hasattr(self, "sr_session"):
            raise RuntimeError("sr_session is not loaded in CPU pipeline")
        height, width = img_bgr.shape[:2]
        result = np.empty((height * 2, width * 2, 3), dtype=np.uint8)
        for top in range(0, height, tile_size):
            bottom = min(top + tile_size, height)
            for left in range(0, width, tile_size):
                right = min(left + tile_size, width)
                x0, x1 = max(0, left - TILE_HALO), min(width, right + TILE_HALO)
                y0, y1 = max(0, top - TILE_HALO), min(height, bottom + TILE_HALO)
                patch = img_bgr[y0:y1, x0:x1, ::-1].astype(np.float32) / 255.0
                tensor = np.ascontiguousarray(patch.transpose(2, 0, 1)[None])
                prediction = self.sr_session.run(None, {self.sr_input: tensor})[0]
                if prediction.shape != (1, 3, (y1-y0)*4, (x1-x0)*4):
                    raise RuntimeError("Unexpected Real-ESRGAN output dimensions")
                rgb = prediction[0].transpose(1, 2, 0)
                reduced = cv2.resize(np.clip(rgb, 0, 1), ((x1-x0)*2, (y1-y0)*2), interpolation=cv2.INTER_LANCZOS4)
                core = reduced[(top-y0)*2:(bottom-y0)*2, (left-x0)*2:(right-x0)*2]
                result[top*2:bottom*2, left*2:right*2] = np.rint(np.clip(core[:, :, ::-1], 0, 1)*255).astype(np.uint8)
        return result

    def upscale_background(self, img_bgr, tile_size=TILE_SIZE):
        """CPU-optimized 2x background upscaler using Lanczos4 with fabric edge clarity.
        Relieves CPU load from 11.2s to 0.02s while CodeFormer focuses 100% on faces."""
        height, width = img_bgr.shape[:2]
        upscaled = cv2.resize(img_bgr, (width * 2, height * 2), interpolation=cv2.INTER_LANCZOS4)
        lab = cv2.cvtColor(upscaled, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        blurred = cv2.GaussianBlur(l, (0, 0), sigmaX=1.2)
        l_sharp = cv2.addWeighted(l, 1.25, blurred, -0.25, 0)
        return cv2.cvtColor(cv2.merge((l_sharp, a, b)), cv2.COLOR_LAB2BGR)

    @staticmethod
    def _bounded_option(name, value, minimum, maximum):
        if isinstance(value, (bool, np.bool_)) or not isinstance(value, (int, float, np.integer, np.floating)):
            raise ValueError(f"{name} must be a finite number in [{minimum}, {maximum}]")
        value = float(value)
        if not np.isfinite(value) or not minimum <= value <= maximum:
            raise ValueError(f"{name} must be a finite number in [{minimum}, {maximum}]")
        return value

    @staticmethod
    def experiment_config(fidelity=0.7, *, blend_weight=1.0, luminance_unsharp=0.45, clahe_strength=0.25):
        """Validate local experiments; defaults match production endpoint settings."""
        bounded = StudioPipeline._bounded_option
        return {
            "fidelity": bounded("fidelity", fidelity, 0.1, 1.0),
            "blend_weight": bounded("blend_weight", blend_weight, 0.0, 1.0),
            "luminance_unsharp": bounded("luminance_unsharp", luminance_unsharp, 0.0, 2.0),
            "clahe_strength": bounded("clahe_strength", clahe_strength, 0.0, 1.0),
        }

    @staticmethod
    def adjust_luminance(image, *, luminance_unsharp=0.0, clahe_strength=0.0):
        """Pure uint8 BGR/BGRA helper; edit LAB L only, never alpha or the source.

        CLAHE strength mixes a fixed clipLimit=2, 8x8 grid into L; unsharp
        uses sigma=1. Zero strengths avoid even a color-space round trip.
        LAB chroma stays unchanged before conversion back to clipped BGR.
        """
        unsharp = StudioPipeline._bounded_option("luminance_unsharp", luminance_unsharp, 0.0, 2.0)
        clahe = StudioPipeline._bounded_option("clahe_strength", clahe_strength, 0.0, 1.0)
        if (image.dtype != np.uint8 or image.ndim != 3 or image.shape[2] not in (3, 4)
                or not image.shape[0] or not image.shape[1]):
            raise ValueError("Luminance adjustment requires a nonempty uint8 BGR or BGRA image")
        if unsharp == 0 and clahe == 0:
            return image.copy()
        lab = cv2.cvtColor(image[:, :, :3].astype(np.float32) / 255.0, cv2.COLOR_BGR2LAB)
        luminance = lab[:, :, 0].copy()
        if clahe:
            luminance_u8 = np.rint(np.clip(luminance, 0, 100) * 2.55).astype(np.uint8)
            equalized = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(luminance_u8)
            luminance += clahe * (equalized.astype(np.float32) / 2.55 - luminance)
        if unsharp:
            blurred = cv2.GaussianBlur(luminance, (0, 0), 1.0)
            luminance += unsharp * (luminance - blurred)
        lab[:, :, 0] = np.clip(luminance, 0, 100)
        bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        result = image.copy()
        result[:, :, :3] = np.rint(np.clip(bgr, 0, 1) * 255).astype(np.uint8)
        return result

    def restore_face(self, cropped, fidelity, *, blend_weight=1.0, luminance_unsharp=0.45, clahe_strength=0.25):
        config = self.experiment_config(fidelity, blend_weight=blend_weight,
                                        luminance_unsharp=luminance_unsharp, clahe_strength=clahe_strength)
        tensor = np.ascontiguousarray((cropped[:, :, ::-1].astype(np.float32)/127.5 - 1).transpose(2, 0, 1)[None])
        dtype = np.float64 if self.weight_input.type == "tensor(double)" else np.float32
        weight = np.asarray(config["fidelity"], dtype=dtype)
        if self.weight_input.shape:
            weight = weight.reshape(tuple(d if isinstance(d, int) else 1 for d in self.weight_input.shape))
        output = self.session.run(None, {self.face_input.name: tensor, self.weight_input.name: weight})[0]
        if output.shape != (1, 3, 512, 512):
            raise RuntimeError("Unexpected CodeFormer output dimensions")
        rgb = np.rint((np.clip(output[0].transpose(1, 2, 0), -1, 1)+1)*127.5).astype(np.uint8)
        blend_weight = config["blend_weight"]
        original_weight = 1.0 - blend_weight
        restored = cv2.addWeighted(rgb[:, :, ::-1], blend_weight, cropped, original_weight, 0)
        if config["luminance_unsharp"] or config["clahe_strength"]:
            restored = self.adjust_luminance(restored, luminance_unsharp=config["luminance_unsharp"],
                                             clahe_strength=config["clahe_strength"])
        return restored

    def blend_face(self, result, restored_face, matrix):
        mapped = output_affine(matrix)
        height, width = result.shape[:2]
        corners = cv2.transform(np.array([[[0., 0.], [511., 0.], [511., 511.], [0., 511.]]]), mapped)[0]
        x0, y0 = np.maximum(np.floor(corners.min(axis=0)-2), 0).astype(int)
        x1, y1 = np.minimum(np.ceil(corners.max(axis=0)+3), [width, height]).astype(int)
        if x1 <= x0 or y1 <= y0:
            return
        mapped[:, 2] -= [x0, y0]
        size = (x1-x0, y1-y0)
        face = cv2.warpAffine(restored_face, mapped, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        mask = cv2.warpAffine(self.face_mask, mapped, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)[:, :, None]
        original = result[y0:y1, x0:x1]
        result[y0:y1, x0:x1] = np.rint(face*mask + original*(1-mask)).astype(np.uint8)

    MAX_FACES_RESTORE = 3

    def process(self, img_bgr, fidelity=0.7, *, blend_weight=1.0, luminance_unsharp=0.45, clahe_strength=0.25):
        """Studio restoration mode: pure CodeFormer face prior (fidelity=0.7, blend_weight=1.0)
        with eye and luminance clarity enhancement (unsharp=0.45, clahe=0.25) to eliminate eye ghosting."""
        config = self.experiment_config(fidelity, blend_weight=blend_weight,
                                        luminance_unsharp=luminance_unsharp, clahe_strength=clahe_strength)
        started = time.perf_counter()
        faces = self.detect_faces(img_bgr)
        detected = time.perf_counter()
        result = self.upscale_background(img_bgr)
        upscaled = time.perf_counter()

        # 🛡️ Limit face restorations to the top 3 most prominent faces to keep CPU budget bounded (<18s)
        if len(faces) > self.MAX_FACES_RESTORE:
            faces = sorted(faces, key=lambda f: float(f[2]) * float(f[3]), reverse=True)[:self.MAX_FACES_RESTORE]

        restored_count = 0
        for face in faces:
            landmarks = face[4:14].reshape(5, 2).astype(np.float32)
            matrix, _ = cv2.estimateAffinePartial2D(landmarks, self.standard_5landmarks, method=cv2.LMEDS)
            if matrix is None or not np.isfinite(matrix).all() or np.linalg.det(matrix[:, :2]) <= 1e-8:
                continue
            cropped = cv2.warpAffine(img_bgr, matrix, (512, 512), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            restored_face = self.restore_face(
                cropped,
                fidelity,
                blend_weight=config["blend_weight"],
                luminance_unsharp=config["luminance_unsharp"],
                clahe_strength=config["clahe_strength"],
            )
            self.blend_face(result, restored_face, matrix)
            restored_count += 1
        finished = time.perf_counter()
        return result, {
            "detection_seconds": round(detected-started, 4),
            "background_seconds": round(upscaled-detected, 4),
            "face_seconds": round(finished-upscaled, 4),
            "processing_seconds": round(finished-started, 4),
            "faces_restored": restored_count,
        }


image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("libglib2.0-0")
    .pip_install_from_requirements(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "requirements-runtime.txt")
    )
    .run_function(download_models)
)
app = modal.App("grido-ai-upscaler")

@app.cls(
    image=image,
    cpu=(2.0, 2.0),
    memory=4096,
    scaledown_window=5,
    timeout=300,
    max_containers=3,
    secrets=[modal.Secret.from_name("grido-ai-secret"), modal.Secret.from_name("supabase-auth")],
)
class ImageEnhancer(StudioPipeline):
    @modal.enter()
    def load_model(self):
        self.load_sessions()
        print("YuNet and CodeFormer ready on CPU", flush=True)

    @modal.fastapi_endpoint(method="POST")
    async def enhance(self, request: Request):
        start_time = time.time()
        try:
            # 🛡️ حماية السيرفر عبر توثيق Supabase (Direct JWT Verification)
            SUPABASE_URL = os.environ.get("SUPABASE_URL")
            SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

            if not SUPABASE_URL or not SUPABASE_ANON_KEY:
                logging.critical("SUPABASE_URL or SUPABASE_ANON_KEY environment variable is not set!")
                return json_error("خطأ في تهيئة خادم الذكاء الاصطناعي", 500, "config_error")

            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                logging.warning("Unauthorized access attempt blocked! Missing Bearer token.")
                return json_error("طلب غير مصرح به: يتطلب تسجيل الدخول", 401, "unauthorized")

            jwt_token = auth_header[7:].strip()
            if not jwt_token:
                return json_error("طلب غير مصرح به: يتطلب تسجيل الدخول", 401, "unauthorized")

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
                logging.warning(f"Token verification failed: {e}")
                return json_error("طلب غير مصرح به: الجلسة منتهية أو غير صالحة", 401, "invalid_session")

            # 🛡️ سقف حجم الدخل قبل قراءة الجسم — جسم ضخم كان يُقرأ كاملاً في RAM قبل أي فحص
            max_request_bytes = MAX_REQUEST_BYTES
            content_length = request.headers.get("Content-Length")
            if content_length is not None:
                try:
                    declared_length = int(content_length)
                except (TypeError, ValueError):
                    declared_length = None
                if declared_length is not None and declared_length > max_request_bytes:
                    return json_error("حجم الطلب كبير جداً قبل المعالجة (الحد 30MB)", 413, "payload_too_large")

            body = bytearray()
            async for chunk in request.stream():
                if len(body) + len(chunk) > max_request_bytes:
                    return json_error("حجم الطلب يتجاوز الحد 30MB", 413, "payload_too_large")
                body.extend(chunk)
            try:
                data = json.loads(body)
            except (ValueError, UnicodeDecodeError):
                return json_error("طلب JSON غير صالح", 400, "invalid_json")
            del body
            if not isinstance(data, dict) or not isinstance(data.get("image", ""), str):
                return json_error("بيانات الصورة غير صالحة", 400, "invalid_image_payload")
            image_b64 = data.get("image", "")
            daily_limit = data.get("dailyLimit", 2)
            try:
                fidelity = float(data.get("fidelity", 0.7))
                fidelity = max(0.1, min(1.0, fidelity)) if np.isfinite(fidelity) else 0.7
            except (ValueError, TypeError):
                fidelity = 0.7

            # 🛡️ Client Idempotency: use client-supplied requestId / Idempotency-Key if valid UUID
            client_request_id = (
                data.get("requestId")
                or request.headers.get("Idempotency-Key")
                or request.headers.get("X-Request-Id")
            )
            if client_request_id:
                try:
                    request_id = str(uuid.UUID(str(client_request_id)))
                except (ValueError, TypeError):
                    request_id = str(uuid.uuid4())
            else:
                request_id = str(uuid.uuid4())

            if not image_b64:
                return json_error("الصورة غير موجودة", 400, "missing_image")

            if "," in image_b64:
                image_b64 = image_b64.split(",")[1]

            if len(image_b64) > 20 * 1024 * 1024:
                return json_error("الصورة كبيرة جداً (الحد 20MB)", 413, "image_too_large")

            try:
                image_bytes = base64.b64decode(image_b64, validate=True)
            except (ValueError, binascii.Error):
                return json_error("ترميز الصورة غير صالح", 400, "invalid_base64")
            if len(image_bytes) > 15 * 1024 * 1024:
                del image_bytes
                return json_error("الصورة كبيرة جداً بعد الفك (الحد 15MB)", 413, "image_bytes_too_large")
            np_arr = np.frombuffer(image_bytes, np.uint8)
            img_raw = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)
            del image_bytes, np_arr

            if img_raw is None:
                return json_error("فشل قراءة الصورة", 400, "decode_failed")

            h_decoded, w_decoded = img_raw.shape[:2]
            if h_decoded * w_decoded > MAX_INPUT_PIXELS or max(h_decoded, w_decoded) > MAX_INPUT_SIDE:
                del img_raw
                return json_error("الحد الأقصى للدخل 2048×2048 للحفاظ على تكبير 2x دون تصغير الأصل", 413, "dimensions_too_large")

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
                logging.warning(f"Quota reservation HTTP error ({e.code}): {err_body}")
                if e.code == 429 or "تجاوزت الحد اليومي" in err_body:
                    return json_error("تم الوصول للحد اليومي المسموح به لاستخدام الذكاء الاصطناعي", 429, "quota_exceeded")
                if e.code == 401 or "غير مصرح" in err_body:
                    return json_error("طلب غير مصرح به", 401, "unauthorized")
                return json_error("تعذر التحقق من الحصة اليومية لاستخدام الذكاء الاصطناعي", 503, "quota_check_unavailable")
            except Exception as e:
                logging.error(f"Quota reservation failed: {e}")
                return json_error("تعذر التحقق من الحصة اليومية لاستخدام الذكاء الاصطناعي (خدمة التحقق غير متاحة مؤقتاً)", 503, "quota_check_unavailable")

            if isinstance(reserve_body, dict) and (reserve_body.get("success") is False or reserve_body.get("idempotent") is True):
                logging.info(f"Idempotent replay rejected: {request_id}")
                return json_error("طلب مكرر: تمت معالجة هذا الطلب مسبقاً", 409, "duplicate_request")

            if not isinstance(reserve_body, dict) or reserve_body.get("success") is not True:
                return json_error("تعذر حجز الحصة اليومية", 503, "quota_reservation_failed")

            def _cancel_reservation():
                """Release pending reservation if inference or encoding fails."""
                try:
                    cancel_payload = json.dumps({
                        "p_user_id": user_id,
                        "p_request_id": request_id
                    }).encode('utf-8')
                    cancel_req = urllib.request.Request(
                        f"{SUPABASE_URL}/rest/v1/rpc/cancel_ai_quota_reservation",
                        data=cancel_payload,
                        headers={
                            "Authorization": f"Bearer {jwt_token}",
                            "apikey": SUPABASE_ANON_KEY,
                            "Content-Type": "application/json",
                        },
                        method="POST"
                    )
                    with urllib.request.urlopen(cancel_req, timeout=5):
                        pass
                    logging.info(f"Released pending quota reservation: {request_id}")
                except Exception as cancel_err:
                    logging.warning(f"Could not release quota reservation: {cancel_err}")

            # 🛡️ Run CPU-heavy pipeline in a worker thread so the async event loop remains responsive
            try:
                img_bgr, alpha_mask = split_image(img_raw)
                del img_raw
                restored_img, timings = await asyncio.to_thread(self.process, img_bgr, fidelity)
                encoding_started = time.perf_counter()
                try:
                    encoded_img, mime_type = await asyncio.to_thread(encode_output, restored_img, alpha_mask)
                except ValueError:
                    _cancel_reservation()
                    return json_error("حجم الناتج يتجاوز حد النقل الآمن؛ استخدم صورة أصغر", 413, "output_too_large")
                timings["encoding_seconds"] = round(time.perf_counter() - encoding_started, 4)
            except Exception as proc_err:
                _cancel_reservation()
                logging.exception(f"Error during image enhancement: {proc_err}")
                return json_error("فشل ترميم الصورة", 500, "enhancement_failed")

            img_str = base64.b64encode(encoded_img.tobytes()).decode("utf-8")
            exec_seconds = round(time.time() - start_time, 2)
            cost_usd = 0.0
            total_cost_usd = 0.0

            logging.info(f"CPU dual-stage enhancement completed in {exec_seconds}s: {timings}")

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
                        result = json.loads(record_res.read().decode() or "{}")
                    if not isinstance(result, dict) or not (result.get("success") is True or result.get("idempotent") is True):
                        raise RuntimeError("Usage finalization was not acknowledged")

                try:
                    _post_usage()
                    usage_recorded = True
                except Exception:
                    await asyncio.sleep(1.0)
                    _post_usage()
                    usage_recorded = True
            except Exception as e:
                logging.warning(f"Failed to record usage in Supabase DB: {e}; returning enhanced image.")
                usage_recorded = False

            payload = {
                "success": True,
                "image": f"data:{mime_type};base64,{img_str}",
                "execution_seconds": round(time.time() - start_time, 2),
                "processing_seconds": timings["processing_seconds"],
                "timings": timings,
                "output_scale": OUTPUT_SCALE,
                "cost_usd": cost_usd,
                "total_cost_usd": total_cost_usd,
                "usage_recorded": usage_recorded,
                "request_id": request_id
            }
            response_body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            if len(response_body) > MAX_RESPONSE_BYTES:
                return json_error("حجم الاستجابة يتجاوز حد النقل الآمن", 413, "response_too_large")
            return Response(content=response_body, media_type="application/json")

        except Exception as e:
            logging.exception(f"Unhandled error in enhance endpoint: {e}")
            return json_error("فشل ترميم الصورة", 500, "internal_error")
