import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createStudioLoop } from "./scene-loop";
import {
  clampStudioPointer,
  fitStudioView,
  studioPixelRatio,
  type StudioView,
} from "./scene-math";
import { disposeStudioResources } from "./studio-geometry";

export interface StudioFrame {
  time: number;
  delta: number;
  animated: boolean;
  pointer: Readonly<THREE.Vector2>;
}

interface StudioOptions {
  camera: [number, number, number];
  target?: [number, number, number];
  view: StudioView;
  onUnavailable: () => void;
  onMotionChange: (playing: boolean, reducedMotion: boolean) => void;
}

export interface StudioScene {
  scene: THREE.Scene;
  start: (update: (frame: StudioFrame) => void) => void;
  invalidate: () => void;
  toggleMotion: () => void;
  resetView: () => void;
  loadImage: (url: string, onLoad: (image: HTMLImageElement) => void) => void;
  dispose: () => void;
}

export function createStudioScene(
  container: HTMLDivElement,
  options: StudioOptions,
): StudioScene {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 30);
  camera.position.set(...options.camera);
  camera.lookAt(...(options.target ?? [0, 0, 0]));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);

  let environment: THREE.WebGLRenderTarget | undefined;
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  try {
    environment = pmrem.fromScene(room, 0.08, 0.1, 100, { size: 128 });
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.75;
  } catch (error) {
    renderer.dispose();
    throw error;
  } finally {
    room.dispose();
    pmrem.dispose();
  }

  scene.add(new THREE.HemisphereLight(0xffffff, 0x24262d, 1.5));
  const key = new THREE.DirectionalLight(0xfff8f0, 2.4);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc4d9ff, 1.3);
  fill.position.set(4, 1, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xe0e8ff, 1.8);
  rim.position.set(2, 3, -4);
  scene.add(rim);

  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab";
  container.appendChild(canvas);

  const pointer = new THREE.Vector2();
  const targetPointer = new THREE.Vector2();
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const images = new Set<HTMLImageElement>();
  let paused = false;
  let started = false;
  let disposed = false;
  let failed = false;
  let visible = typeof IntersectionObserver === "undefined";
  let hasSize = false;
  let dragging: {
    id: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null = null;
  let update: ((frame: StudioFrame) => void) | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let intersectionObserver: IntersectionObserver | undefined;

  const loop = createStudioLoop((time, delta, animated) => {
    if (!started || failed || disposed) return;
    const follow = animated ? 1 - Math.exp(-8 * Math.max(delta, 1 / 60)) : 1;
    pointer.lerp(targetPointer, follow);
    try {
      update?.({ time, delta, animated, pointer });
      renderer.render(scene, camera);
    } catch {
      unavailable();
    }
  });
  loop.setVisible(false);

  const stopDragging = () => {
    const pointerId = dragging?.id;
    dragging = null;
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId))
      canvas.releasePointerCapture(pointerId);
    canvas.style.cursor = "grab";
  };

  const syncVisibility = () => {
    const active =
      started && visible && hasSize && !document.hidden && !failed && !disposed;
    loop.setVisible(active);
    if (!active) {
      stopDragging();
      pointer.set(0, 0);
      targetPointer.set(0, 0);
    }
  };

  const syncMotion = () => {
    loop.setAnimated(!paused && !media.matches);
    if (media.matches) {
      pointer.set(0, 0);
      targetPointer.set(0, 0);
    }
    options.onMotionChange(!paused && !media.matches, media.matches);
    loop.invalidate();
  };

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    hasSize = width > 0 && height > 0;
    if (hasSize) {
      Object.assign(camera, fitStudioView(width, height, options.view));
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(
        studioPixelRatio(width, height, window.devicePixelRatio),
      );
      renderer.setSize(width, height, false);
    }
    syncVisibility();
    loop.invalidate();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) return;
    container.focus({ preventScroll: true });
    dragging = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: targetPointer.x,
      originY: targetPointer.y,
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (dragging?.id === event.pointerId) {
      targetPointer.set(
        clampStudioPointer(
          dragging.originX + (event.clientX - dragging.x) / (rect.width * 0.4),
        ),
        clampStudioPointer(
          dragging.originY +
            (event.clientY - dragging.y) / (rect.height * 0.65),
        ),
      );
    } else if (event.pointerType === "mouse" && !paused && !media.matches) {
      targetPointer.set(
        clampStudioPointer(
          ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        ),
        clampStudioPointer(
          ((event.clientY - rect.top) / rect.height - 0.5) * 2,
        ),
      );
    } else {
      return;
    }
    loop.invalidate();
  };

  const onPointerLeave = () => {
    if (dragging) return;
    targetPointer.set(0, 0);
    loop.invalidate();
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (dragging?.id !== event.pointerId) return;
    stopDragging();
    targetPointer.set(0, 0);
    loop.invalidate();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target !== container) return;
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-0.2, 0],
      ArrowRight: [0.2, 0],
      ArrowUp: [0, -0.2],
      ArrowDown: [0, 0.2],
    };
    const step = steps[event.key];
    if (!step && event.key !== "Home") return;
    event.preventDefault();
    if (step)
      targetPointer.set(
        clampStudioPointer(targetPointer.x + step[0]),
        clampStudioPointer(targetPointer.y + step[1]),
      );
    else targetPointer.set(0, 0);
    loop.invalidate();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    loop.dispose();
    stopDragging();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", syncVisibility);
    media.removeEventListener("change", syncMotion);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerEnd);
    canvas.removeEventListener("pointercancel", onPointerEnd);
    canvas.removeEventListener("lostpointercapture", onPointerEnd);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    container.removeEventListener("keydown", onKeyDown);
    for (const image of images) {
      image.onload = null;
      image.onerror = null;
    }
    images.clear();
    scene.environment = null;
    disposeStudioResources(scene);
    environment?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };

  const unavailable = () => {
    if (failed || disposed) return;
    failed = true;
    dispose();
    options.onUnavailable();
  };

  const onContextLost = (event: Event) => {
    event.preventDefault();
    unavailable();
  };

  try {
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerEnd);
    canvas.addEventListener("pointercancel", onPointerEnd);
    canvas.addEventListener("lostpointercapture", onPointerEnd);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("webglcontextlost", onContextLost);
    container.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("resize", resize, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
    }
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          syncVisibility();
        },
        { threshold: 0.01 },
      );
      intersectionObserver.observe(container);
    }
    resize();
  } catch (error) {
    dispose();
    throw error;
  }

  return {
    scene,
    start(onUpdate) {
      update = onUpdate;
      started = true;
      syncMotion();
      syncVisibility();
      loop.invalidate();
    },
    invalidate: loop.invalidate,
    toggleMotion() {
      paused = !paused;
      syncMotion();
    },
    resetView() {
      pointer.set(0, 0);
      targetPointer.set(0, 0);
      loop.invalidate();
    },
    loadImage(url, onLoad) {
      const image = new Image();
      images.add(image);
      image.onload = () => {
        images.delete(image);
        image.onload = null;
        image.onerror = null;
        if (disposed) return;
        try {
          onLoad(image);
          loop.invalidate();
        } catch {
          unavailable();
        }
      };
      image.onerror = () => {
        images.delete(image);
        image.onload = null;
        image.onerror = null;
      };
      image.src = url;
    },
    dispose,
  };
}
