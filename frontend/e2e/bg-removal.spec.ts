import { test, expect } from '@playwright/test';

test.describe('Background Removal Assets E2E Test', () => {

  test('Verify ONNXRuntime Web assets are served correctly on Vite port 5173 (v2)', async ({ request }) => {
    const response = await request.get('http://localhost:5173/onnxruntime-web-v2/ort-wasm-simd-threaded.mjs');
    
    expect(response.ok()).toBe(true);
    const text = await response.text();
    
    expect(text.startsWith('<!DOCTYPE') || text.startsWith('<html')).toBe(false);
    expect(text).toContain('ortWasmThreaded');
    expect(text.length).toBeGreaterThan(20000);
    
    console.log(`\n✅ Vite Port (5173): Verified asset size in v2 folder is ${text.length} bytes.`);
  });

  test('Verify ONNXRuntime Web assets are served correctly on Wails port 34115 (v2)', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:34115/onnxruntime-web-v2/ort-wasm-simd-threaded.mjs');
    
    expect(response.ok()).toBe(true);
    const text = await response.text();
    
    expect(text.startsWith('<!DOCTYPE') || text.startsWith('<html')).toBe(false);
    expect(text).toContain('ortWasmThreaded');
    expect(text.length).toBeGreaterThan(20000);
    
    console.log(`\n✅ Wails Port (34115): Verified asset size in v2 folder is ${text.length} bytes.`);
  });

  test('Verify resources.json manifest contains valid mappings', async ({ request }) => {
    const response = await request.get('http://localhost:5173/models/resources.json');
    
    expect(response.ok()).toBe(true);
    const manifest: any = await response.json();
    
    const key = '/onnxruntime-web/ort-wasm-simd-threaded.mjs';
    expect(manifest[key]).toBeDefined();
    const mjsInfo = manifest[key];
    expect(mjsInfo).toHaveProperty('size');
    expect(mjsInfo.size).toBeGreaterThan(0);
    
    console.log(`\n✅ Verified resources.json loaded with expected keys. Size property: ${mjsInfo.size}`);
  });
});
