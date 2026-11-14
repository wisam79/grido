import { Buffer } from "node:buffer";

import { test as base, expect, type Page } from "@playwright/test";

const MOCK_ORIGIN = "https://ux-mock.invalid";
const USER_ID = "00000000-0000-4000-8000-000000000007";
const USER_EMAIL = "ux-user@example.invalid";

type MockState = {
  unexpected: string[];
  patches: Record<string, unknown>[];
  revoked: number;
  photoAttempts: number;
  holdSave: boolean;
  failNextPhoto: boolean;
  releaseSave: (() => void) | null;
};

// Exercise the real /admin and /cam routes, not standalone component previews.
// All REST/storage/auth traffic is mocked before navigation; external HTTP and
// WebSockets fail closed. The tokens below are unsigned, local fixture data.
const test = base.extend<{ api: MockState }>({
  api: async ({ context, baseURL }, provide) => {
    const state: MockState = {
      unexpected: [],
      patches: [],
      revoked: 0,
      photoAttempts: 0,
      holdSave: false,
      failNextPhoto: false,
      releaseSave: null,
    };
    let profile = {
      id: USER_ID,
      name: "مستخدم اصطناعي",
      email: USER_EMAIL,
      plan: "pro",
      status: "active",
      expires_at: "2035-01-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      license_key: null,
    };
    const localOrigin = new URL(baseURL!).origin;
    await context.addInitScript(
      ({ origin, userId, email }) => {
        const encode = (value: object) =>
          btoa(JSON.stringify(value))
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;
        const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({
          sub: userId,
          exp: expiresAt,
          role: "authenticated",
        })}.fixture-not-a-signature`;
        localStorage.setItem("grido_sb_url", origin);
        localStorage.setItem(
          "grido_sb_key",
          "ux-public-placeholder-not-a-real-key",
        );
        localStorage.setItem(
          "grido_admin_auth",
          JSON.stringify({
            access_token: token,
            refresh_token: "ux-refresh-placeholder",
            token_type: "bearer",
            expires_at: expiresAt,
            expires_in: 3600,
            user: {
              id: userId,
              email,
              aud: "authenticated",
              role: "authenticated",
              app_metadata: {},
              user_metadata: {},
              created_at: "2026-01-01T00:00:00Z",
            },
          }),
        );
        // Deterministic denied-camera path; never prompt for real device access.
        Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
          configurable: true,
          value: async () => {
            throw new DOMException(
              "Synthetic camera denial",
              "NotAllowedError",
            );
          },
        });
      },
      { origin: MOCK_ORIGIN, userId: USER_ID, email: USER_EMAIL },
    );

    await context.routeWebSocket("**/*", (socket) => {
      const url = new URL(socket.url());
      if (url.hostname === "127.0.0.1" && url.port === new URL(baseURL!).port) {
        socket.connectToServer(); // Local Vite HMR only.
      } else {
        if (url.hostname !== "ux-mock.invalid")
          state.unexpected.push(`WS ${url.hostname}`);
        socket.close({ code: 1000, reason: "Offline UX fixture" });
      }
    });
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === localOrigin) {
        await route.continue();
        return;
      }
      if (
        url.origin === "https://fonts.googleapis.com" ||
        url.origin === "https://fonts.gstatic.com"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "text/css",
          body: "",
        });
        return;
      }
      if (url.origin !== MOCK_ORIGIN) {
        state.unexpected.push(
          `${request.method()} ${url.origin}${url.pathname}`,
        );
        await route.abort("blockedbyclient");
        return;
      }
      const headers = {
        "access-control-allow-origin": localOrigin,
        // Authorization is not covered by the CORS wildcard-header shorthand.
        "access-control-allow-headers":
          "authorization, apikey, x-client-info, content-type, prefer, range, cache-control, x-upsert",
        "access-control-allow-methods": "GET,HEAD,POST,PATCH,OPTIONS",
        "access-control-expose-headers": "content-range",
      };
      const reply = (json: unknown, status = 200, extra = {}) =>
        route.fulfill({ status, json, headers: { ...headers, ...extra } });
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      if (url.pathname === "/rest/v1/rpc/is_admin") {
        await reply(true);
        return;
      }
      if (url.pathname === "/rest/v1/rpc/admin_revoke_license") {
        state.revoked += 1;
        profile = { ...profile, plan: "free" };
        await reply(null);
        return;
      }
      if (
        url.pathname === "/rest/v1/profiles" &&
        request.method() === "PATCH"
      ) {
        state.patches.push(request.postDataJSON() as Record<string, unknown>);
        if (state.holdSave)
          await new Promise<void>((resolve) => {
            state.releaseSave = resolve;
          });
        profile = { ...profile, ...state.patches[state.patches.length - 1] };
        await reply(null);
        return;
      }
      if (
        [
          "/rest/v1/profiles",
          "/rest/v1/ai_usage",
          "/rest/v1/license_keys",
        ].includes(url.pathname)
      ) {
        const isProfiles = url.pathname.endsWith("/profiles");
        const count = isProfiles ? 1 : 0;
        if (request.method() === "HEAD") {
          await route.fulfill({
            status: 200,
            body: "",
            headers: {
              ...headers,
              "content-range": `${count ? "0-0" : "*"}/${count}`,
            },
          });
        } else if (request.method() === "GET") {
          await reply(isProfiles ? [profile] : []);
        } else {
          state.unexpected.push(`${request.method()} ${url.pathname}`);
          await reply({ message: "Unexpected fixture operation" }, 500);
        }
        return;
      }
      if (
        url.pathname.startsWith("/storage/v1/object/phone-bridge/") &&
        request.method() === "POST"
      ) {
        if (!url.pathname.endsWith(".handshake.json")) {
          state.photoAttempts += 1;
          if (state.failNextPhoto) {
            state.failNextPhoto = false;
            await reply(
              {
                statusCode: "503",
                error: "FixtureUploadFailure",
                message: "Synthetic retry failure",
              },
              503,
            );
            return;
          }
        }
        await reply({ Key: url.pathname.replace("/storage/v1/object/", "") });
        return;
      }
      state.unexpected.push(`${request.method()} ${url.pathname}`);
      await reply({ message: "Unmapped API: offline fixture rejects it" }, 500);
    });
    try {
      await provide(state);
    } finally {
      state.releaseSave?.();
    }
    expect(
      state.unexpected,
      "No unmapped API or live external traffic",
    ).toEqual([]);
  },
});

async function openAdmin(page: Page) {
  await page.goto("/admin");
  const row = page.getByRole("row").filter({ hasText: USER_EMAIL });
  await expect(row).toBeVisible();
  return row;
}

async function syntheticPhoto(page: Page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#334155";
    ctx.fillRect(0, 0, 64, 48);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(8, 8, 48, 32);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return {
    name: "synthetic-ux.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  };
}

test("edit form labels, disabled email, focus trap, Escape and busy save @smoke", async ({
  page,
  api,
}, testInfo) => {
  const row = await openAdmin(page);
  const trigger = row.getByRole("button", { name: "تعديل", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: `تعديل حساب: ${USER_EMAIL}`,
  });
  const name = dialog.getByRole("textbox", { name: "الاسم الكامل" });
  await expect(name).toBeFocused();
  await expect(
    dialog.getByRole("textbox", { name: "البريد الإلكتروني" }),
  ).toBeDisabled();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("combobox", { name: "الباقة المستهدفة" }),
  ).toBeFocused();
  for (let step = 0; step < 9; step += 1) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    await expect(
      dialog.getByRole("textbox", { name: "البريد الإلكتروني" }),
    ).not.toBeFocused();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(api.patches).toHaveLength(0);

  await page.keyboard.press("Enter");
  await name.fill("اسم اختبار محفوظ");
  await dialog
    .getByRole("combobox", { name: "الباقة المستهدفة" })
    .selectOption("enterprise");
  await dialog
    .getByRole("combobox", { name: "حالة الحساب" })
    .selectOption("expired");
  api.holdSave = true;
  await dialog.getByRole("button", { name: "حفظ التعديلات" }).click();
  try {
    await expect.poll(() => api.patches.length).toBe(1);
    await expect(dialog).toHaveAttribute("aria-busy", "true");
    await expect(name).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "إغلاق النافذة" }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "إلغاء", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    expect(api.patches).toHaveLength(1);
    expect(api.patches[0]).toMatchObject({
      name: "اسم اختبار محفوظ",
      plan: "enterprise",
      status: "expired",
    });
    expect(api.patches[0]).not.toHaveProperty("email");
  } finally {
    api.releaseSave?.();
  }
  await expect(dialog).toBeHidden();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "تم تحديث بيانات الاشتراك والحساب بنجاح!" }),
  ).toBeVisible();
  await expect(row).toContainText("اسم اختبار محفوظ");
  // Evidence only; no visual pass or automatically blessed snapshot baseline.
  await testInfo.attach("admin-edited-synthetic", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("danger confirmation starts on cancel and restores trigger without mutation @smoke", async ({
  page,
  api,
}) => {
  const row = await openAdmin(page);
  const trigger = row.getByRole("button", { name: "سحب", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("alertdialog", { name: "تأكيد إجراء خطير" });
  const cancel = dialog.getByRole("button", { name: "إلغاء", exact: true });
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "سحب الترخيص", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(api.revoked).toBe(0);
  await page.keyboard.press("Enter");
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Enter"); // Safe default cancels, not destructive action.
  await expect(dialog).toBeHidden();
  expect(api.revoked).toBe(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await dialog
    .getByRole("button", { name: "سحب الترخيص", exact: true })
    .click();
  await expect.poll(() => api.revoked).toBe(1);
  await expect(
    page.getByRole("status").filter({ hasText: "تم إلغاء الترخيص بنجاح." }),
  ).toBeVisible();
});

test("phone missing session leaves upload controls disabled and outside Tab order @smoke", async ({
  page,
  api,
}) => {
  await page.goto("/cam");
  await expect(
    page.getByRole("status").filter({ hasText: "الجلسة مفقودة" }),
  ).toBeVisible();
  const disabled = [
    page.getByRole("button", { name: "اختيار من الصور" }),
    page.getByRole("button", { name: "التقاط صورة", exact: true }),
    page.getByRole("button", { name: "كاميرا النظام", exact: true }),
    page.getByRole("button", { name: "اختيار ملف صورة", exact: true }),
  ];
  for (const control of disabled) await expect(control).toBeDisabled();
  await expect(page.getByLabel("ملفات الصور")).toBeDisabled();
  const sound = page.getByRole("button", { name: "صوت الغالق" });
  await sound.focus();
  await page.keyboard.press("Space");
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("Tab");
    for (const control of disabled) await expect(control).not.toBeFocused();
  }
  expect(api.photoAttempts).toBe(0);
});

test("phone denied camera offers synthetic file, failed-upload retry and responsive controls @smoke", async ({
  page,
  api,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  api.failNextPhoto = true;
  await page.goto("/camera#session=ux-synthetic-room");
  await expect(
    page.getByRole("status").filter({ hasText: "المعاينة غير متاحة" }),
  ).toBeVisible();
  const choose = page.getByRole("button", {
    name: "اختيار ملف صورة",
    exact: true,
  });
  await expect(choose).toBeEnabled();
  const photo = await syntheticPhoto(page);
  const chooserEvent = page.waitForEvent("filechooser");
  await choose.focus();
  await page.keyboard.press("Enter");
  await (await chooserEvent).setFiles(photo);
  await expect(page.getByRole("alert")).toContainText("تعذر رفع الصورة");
  const retry = page.getByRole("button", {
    name: "إعادة رفع الصور المتعذرة (1)",
    exact: true,
  });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => api.photoAttempts).toBe(2);
  await expect(retry).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: "تم رفع الصورة إلى التخزين" }),
  ).toBeVisible();
  await expect(page.getByLabel("رُفعت 1 صور إلى التخزين")).toBeVisible();
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    for (const label of ["اختيار من الصور", "التقاط صورة", "تبديل الكاميرا"]) {
      const control = page.getByRole("button", { name: label, exact: true });
      await control.focus();
      await expect(control).toBeInViewport();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  }
  await testInfo.attach("phone-synthetic-landscape", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});
