import base64
import io
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import cv2
import numpy as np
from fastapi import Request

from modal_ai import upscaler as module


class ResizeSession:
    def run(self, _, inputs):
        rgb = next(iter(inputs.values()))[0].transpose(1, 2, 0)
        enlarged = cv2.resize(rgb, (rgb.shape[1]*4, rgb.shape[0]*4), interpolation=cv2.INTER_NEAREST)
        return [enlarged.transpose(2, 0, 1)[None]]


class PipelineTests(unittest.TestCase):
    def test_affine_landmarks_rotation_translation_and_scale(self):
        points = np.array([[[12., 21.], [94., 44.], [71., 120.], [17., 155.], [125., 163.]]])
        for angle in (-35, 0, 42):
            for scale in (0.5, 1., 2.3):
                matrix = cv2.getRotationMatrix2D((80, 90), angle, scale)
                matrix[:, 2] += [34, -17]
                aligned = cv2.transform(points, matrix)
                mapped = cv2.transform(aligned, module.output_affine(matrix))
                np.testing.assert_allclose(mapped, points*2 + .5, atol=1e-9)

    def test_mask_zero_edges_and_continuous_neck_transition(self):
        mask = module.create_face_mask()
        self.assertEqual(mask.shape, (512, 512))
        self.assertTrue(np.all(mask[[0, -1]] == 0))
        self.assertTrue(np.all(mask[:, [0, -1]] == 0))
        self.assertGreater(mask[260, 256], .99)
        self.assertLess(np.abs(np.diff(mask[:, 256])).max(), .05)

    def test_background_exact_2x_odd_dimensions_and_tile_seams(self):
        pipeline = module.StudioPipeline()
        pipeline.sr_session = ResizeSession()
        pipeline.sr_input = "input"
        image = np.random.default_rng(7).integers(0, 256, (91, 113, 3), dtype=np.uint8)
        tiled = pipeline.upscale_background(image, tile_size=40)
        full = pipeline.upscale_background(image, tile_size=256)
        self.assertEqual(tiled.shape, (182, 226, 3))
        np.testing.assert_array_equal(tiled, full)

    def test_no_faces_still_upscales(self):
        pipeline = module.StudioPipeline()
        pipeline.detect_faces = lambda _: []
        pipeline.upscale_background = lambda image: cv2.resize(image, None, fx=2, fy=2)
        image, timings = pipeline.process(np.zeros((13, 17, 3), dtype=np.uint8))
        self.assertEqual(image.shape, (26, 34, 3))
        self.assertEqual(timings["faces_restored"], 0)

    def test_detection_rounding_maps_pixel_centers(self):
        pipeline = module.StudioPipeline()
        face = np.array([[10, 12, 30, 40, 20, 22, 35, 22, 29, 31, 22, 40, 36, 40, .99]], dtype=np.float32)
        pipeline.detector = SimpleNamespace(detect=lambda image: (None, face.copy()))
        result = pipeline.detect_faces(np.zeros((731, 1103, 3), np.uint8))[0]
        detect_h = round(731*640/1103)
        self.assertAlmostEqual(float(result[8]), (29+.5)*1103/640-.5, places=4)
        self.assertAlmostEqual(float(result[9]), (31+.5)*731/detect_h-.5, places=4)

    def test_png_alpha_exact_lanczos_and_254_preserved(self):
        for value in (0, 254, 255):
            raw = np.full((9, 11, 4), value, dtype=np.uint8)
            _, alpha = module.split_image(raw)
            self.assertIsNotNone(alpha)
            encoded, mime = module.encode_output(np.zeros((18, 22, 3), dtype=np.uint8), alpha)
            decoded = cv2.imdecode(encoded, cv2.IMREAD_UNCHANGED)
            self.assertEqual(mime, "image/png")
            np.testing.assert_array_equal(decoded[:, :, 3], cv2.resize(alpha, (22, 18), interpolation=cv2.INTER_LANCZOS4))
        alpha = np.random.default_rng(9).integers(0, 256, (9, 11), dtype=np.uint8)
        encoded, _ = module.encode_output(np.zeros((18, 22, 3), dtype=np.uint8), alpha)
        decoded = cv2.imdecode(encoded, cv2.IMREAD_UNCHANGED)
        np.testing.assert_array_equal(decoded[:, :, 3], cv2.resize(alpha, (22, 18), interpolation=cv2.INTER_LANCZOS4))

    def test_16bit_alpha_preserved_without_quantization(self):
        raw = np.random.default_rng(3).integers(0, 65536, (9, 11, 4), dtype=np.uint16)
        image, alpha = module.split_image(raw)
        encoded, _ = module.encode_output(cv2.resize(image, (22, 18)), alpha)
        decoded = cv2.imdecode(encoded, cv2.IMREAD_UNCHANGED)
        self.assertEqual(decoded.dtype, np.uint16)
        np.testing.assert_array_equal(decoded[:, :, 3], cv2.resize(raw[:, :, 3], (22, 18), interpolation=cv2.INTER_LANCZOS4))

    def test_jpeg_quality_98_and_444(self):
        original = cv2.imencode
        with patch.object(module.cv2, "imencode", wraps=original) as encode:
            _, mime = module.encode_output(np.zeros((8, 10, 3), dtype=np.uint8), None)
            parameters = encode.call_args.args[2]
            self.assertEqual(parameters[parameters.index(cv2.IMWRITE_JPEG_QUALITY)+1], 98)
            if hasattr(cv2, "IMWRITE_JPEG_SAMPLING_FACTOR"):
                self.assertEqual(parameters[parameters.index(cv2.IMWRITE_JPEG_SAMPLING_FACTOR)+1], cv2.IMWRITE_JPEG_SAMPLING_FACTOR_444)
            self.assertEqual(mime, "image/jpeg")

    def test_codeformer_scalar_weight_contract(self):
        pipeline = module.StudioPipeline()
        pipeline.face_input = SimpleNamespace(name="input")
        pipeline.weight_input = SimpleNamespace(name="weight", type="tensor(double)", shape=[])
        def run(_, inputs):
            self.assertEqual(inputs["weight"].shape, ())
            self.assertEqual(inputs["weight"].dtype, np.float64)
            self.assertEqual(inputs["input"].shape, (1, 3, 512, 512))
            return [inputs["input"]]
        pipeline.session = SimpleNamespace(run=run)
        cropped = np.full((512, 512, 3), 112, dtype=np.uint8)
        np.testing.assert_array_equal(pipeline.restore_face(cropped, .78), cropped)

    def test_roi_blend_matches_full_canvas_warp(self):
        pipeline = module.StudioPipeline()
        pipeline.face_mask = module.create_face_mask()
        matrix = cv2.getRotationMatrix2D((256, 256), 17, 1.6)
        matrix[:, 2] += [-15, 45]
        face = np.full((512, 512, 3), 190, dtype=np.uint8)
        result = np.full((500, 600, 3), 80, dtype=np.uint8)
        mapped = module.output_affine(matrix)
        full_face = cv2.warpAffine(face, mapped, (600, 500), borderMode=cv2.BORDER_REFLECT)
        full_mask = cv2.warpAffine(pipeline.face_mask, mapped, (600, 500))[:, :, None]
        expected = np.rint(full_face*full_mask+result*(1-full_mask)).astype(np.uint8)
        pipeline.blend_face(result, face, matrix)
        self.assertLessEqual(np.abs(result.astype(int)-expected.astype(int)).max(), 1)

    def test_encoded_budget_fail_closed(self):
        with patch.object(module, "MAX_ENCODED_BYTES", 1):
            with self.assertRaises(ValueError):
                module.encode_output(np.zeros((10, 10, 3), dtype=np.uint8), None)


class EndpointTests(unittest.IsolatedAsyncioTestCase):
    async def call_endpoint(self, payload, responses, auth=True, pipeline_error=False):
        user_class = module.ImageEnhancer._get_user_cls()
        enhancer = user_class()
        def process(image, fidelity):
            if pipeline_error:
                raise RuntimeError("inference failed")
            return cv2.resize(image, None, fx=2, fy=2), {"processing_seconds": .01, "faces_restored": 0}
        enhancer.process = process
        calls = []
        body = json.dumps(payload).encode()
        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}
        headers = [(b"authorization", b"Bearer test")] if auth else []
        request = Request({"type": "http", "method": "POST", "path": "/", "headers": headers}, receive)
        def urlopen(request, **kwargs):
            calls.append(request)
            value = responses.pop(0)
            if isinstance(value, Exception):
                raise value
            return io.BytesIO(json.dumps(value).encode())
        endpoint = user_class.__dict__["enhance"]._get_raw_f()
        with patch.dict(os.environ, {"SUPABASE_URL": "https://test.invalid", "SUPABASE_ANON_KEY": "test"}), patch.object(module.urllib.request, "urlopen", side_effect=urlopen), patch.object(module.time, "sleep"):
            response = await endpoint(enhancer, request)
        return response, calls

    def image_payload(self, shape=(9, 11, 4)):
        image = np.full(shape, 125, dtype=np.uint8)
        _, encoded = cv2.imencode(".png", image)
        return {"image": base64.b64encode(encoded).decode()}

    async def test_auth_fails_before_processing(self):
        response, calls = await self.call_endpoint(self.image_payload(), [], auth=False)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(calls, [])

    async def test_one_reservation_finalization_and_2x_alpha(self):
        response, calls = await self.call_endpoint(self.image_payload(), [{"id": "user"}, {"success": True, "state": "reserved"}, {"success": True, "state": "finalized"}])
        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.body)
        self.assertTrue(payload["usage_recorded"])
        decoded = cv2.imdecode(np.frombuffer(base64.b64decode(payload["image"].split(",")[1]), np.uint8), cv2.IMREAD_UNCHANGED)
        self.assertEqual(decoded.shape, (18, 22, 4))
        self.assertEqual(len(calls), 3)
        reserve, final = [json.loads(call.data) for call in calls[1:]]
        self.assertTrue(reserve["p_reserve"])
        self.assertFalse(final["p_reserve"])
        self.assertEqual(reserve["p_request_id"], final["p_request_id"])

    async def test_reserve_replay_never_returns_pixels(self):
        response, calls = await self.call_endpoint(self.image_payload(), [{"id": "user"}, {"success": False, "idempotent": True}])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(len(calls), 2)
        self.assertNotIn("image", json.loads(response.body))

    async def test_finalize_replay_after_lost_response_is_recorded(self):
        response, calls = await self.call_endpoint(self.image_payload(), [{"id": "user"}, {"success": True}, OSError("lost response"), {"success": False, "idempotent": True}])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(calls), 4)

    async def test_finalize_failure_never_returns_pixels(self):
        response, _ = await self.call_endpoint(self.image_payload(), [{"id": "user"}, {"success": True}, OSError("offline"), OSError("offline")])
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("image", json.loads(response.body))

    async def test_oversized_dimensions_rejected_before_reservation(self):
        response, calls = await self.call_endpoint(self.image_payload((1, 2049, 3)), [{"id": "user"}])
        self.assertEqual(response.status_code, 413)
        self.assertEqual(len(calls), 1)

    async def test_invalid_base64_rejected_before_reservation(self):
        response, calls = await self.call_endpoint({"image": "not valid base64!!"}, [{"id": "user"}])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(calls), 1)

    async def test_pipeline_failure_is_not_finalized(self):
        response, calls = await self.call_endpoint(self.image_payload(), [{"id": "user"}, {"success": True}], pipeline_error=True)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(len(calls), 2)


if __name__ == "__main__":
    unittest.main()
