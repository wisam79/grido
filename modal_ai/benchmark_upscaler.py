"""Run real CPU inference locally; no Modal deployment or account access."""
import argparse
import json
import platform
import time
from pathlib import Path

import cv2
import numpy as np

from modal_ai.upscaler import StudioPipeline, TILE_SIZE, TILE_HALO, encode_output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--sizes", default="256,512")
    parser.add_argument("--output", required=True)
    options = parser.parse_args()
    raw = cv2.imread(options.image, cv2.IMREAD_COLOR)
    if raw is None:
        raise ValueError("Cannot read benchmark image")
    started = time.perf_counter()
    pipeline = StudioPipeline()
    pipeline.load_sessions(options.models, threads=4)
    loaded = time.perf_counter() - started
    small = cv2.resize(raw, (77, 65))
    full = pipeline.upscale_background(small)
    tiled = pipeline.upscale_background(small, tile_size=40)
    seam_error = np.abs(full.astype(np.int16)-tiled.astype(np.int16))
    report = {
        "environment": platform.platform(),
        "onnx_threads": 4,
        "tile_size": TILE_SIZE,
        "tile_halo": TILE_HALO,
        "providers": pipeline.session.get_providers(),
        "session_load_seconds": round(loaded, 4),
        "real_model_tile_equivalence_max_byte_error": int(seam_error.max()),
        "real_model_tile_equivalence_mean_byte_error": float(seam_error.mean()),
        "measurements": [],
        "scope": "Local CPU, not Modal or network end-to-end; sessions loaded once; SR warmed by seam test, CodeFormer first call may be cold.",
    }
    for size in map(int, options.sizes.split(",")):
        scale = size/max(raw.shape[:2])
        image = cv2.resize(raw, (round(raw.shape[1]*scale), round(raw.shape[0]*scale)), interpolation=cv2.INTER_AREA)
        output, timings = pipeline.process(image)
        started = time.perf_counter()
        encoded, _ = encode_output(output, None)
        timings["encoding_seconds"] = round(time.perf_counter()-started, 4)
        timings["input_dimensions"] = [image.shape[1], image.shape[0]]
        timings["output_dimensions"] = [output.shape[1], output.shape[0]]
        timings["encoded_bytes"] = int(encoded.nbytes)
        report["measurements"].append(timings)
        print(json.dumps(timings), flush=True)
    Path(options.output).write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
