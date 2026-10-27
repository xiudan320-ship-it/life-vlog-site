import assert from "node:assert/strict";
import test from "node:test";

import { createImageService } from "../modules/image-service.js";
import { createLazyControllerProxy } from "../modules/lazy-controller.js";
import { createSecretUploadService } from "../modules/secret-upload-service.js";
import { createAssetController } from "../modules/asset-controller.js";

test("an unloaded upload-center controller cannot block the R2 upload request", async () => {
  const registry = {};
  const dataSafetyController = createLazyControllerProxy(registry, "dataSafety");
  const callLoaded = (controller, method, ...args) => (
    controller.isLoaded ? controller.get()[method]?.(...args) : undefined
  );
  const requests = [];
  const service = createImageService({
    endpoint: "https://worker.example",
    getAccessToken: () => "fixture-token",
    onTaskChanged: () => callLoaded(dataSafetyController, "renderUploadCenter"),
    fetchApi: async (url, options) => {
      requests.push({ url, method: options.method, body: options.body });
      return new Response(
        JSON.stringify({ key: "fixture-user/photos/fixture.jpg", url: "https://cdn.example/fixture.jpg" }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    },
  });

  const uploaded = await service.uploadToR2(
    new Blob(["fixture"], { type: "image/jpeg" }),
    "fixture"
  );
  assert.equal(uploaded.key, "fixture-user/photos/fixture.jpg");
  assert.equal(requests.length, 1);
});

test("500 secret images plus thumbnails survive the Worker's 60 uploads per minute without real waits", async () => {
  let elapsed = 0;
  let bucketStart = 0;
  let bucketRequests = 0;
  let uploads = 0;
  const waits = [];
  const statuses = [];
  const imageService = createImageService({
    endpoint: "https://worker.fixture", getAccessToken: () => "fixture-only",
    sleepApi: async (delay) => { waits.push(delay); elapsed += delay; },
    fetchApi: async (url, options) => {
      assert.ok(options.signal instanceof AbortSignal, "uploads have a timeout signal");
      if (elapsed - bucketStart >= 60_000) { bucketStart = elapsed; bucketRequests = 0; }
      if (++bucketRequests > 60) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
      const name = options.body.get("name");
      uploads++;
      return new Response(JSON.stringify({ key: `fixture/${name}`, url: `https://cdn.fixture/${name}` }));
    },
  });
  const assets = createAssetController({
    imageService: { ...imageService, compressImage: async () => ({ blob: new Blob(["fixture"]), width: 1080, height: 1080 }) },
    formatFileSize: () => "7 B", setStatus() {},
  });
  const queue = createSecretUploadService();
  await queue.start({
    entries: Array.from({ length: 500 }, (_, index) => ({ label: `fixture-${index}.jpg`, source: index })),
    ensureContext() {},
    upload: (index, statusSetter) => assets.uploadImageFile({ size: 7 }, `fixture-${index}`, 1, 1, {
      throwOnError: true, statusSetter: (message) => { statuses.push(message); statusSetter(message); },
    }),
    async save() {},
  });
  assert.equal(queue.snapshot().saved, 500);
  assert.equal(uploads, 1000, "main images and thumbnails both survive rate limiting");
  assert.equal(waits.length, 16);
  assert.ok(waits.every((delay) => delay === 60_000));
  assert.equal(statuses.filter((message) => message.includes("60 秒后自动继续")).length, 16);
});

test("link imports honor Retry-After and surface the automatic wait", async () => {
  let calls = 0;
  const waits = [];
  const statuses = [];
  const service = createImageService({
    endpoint: "https://worker.fixture", getAccessToken: () => "fixture-only",
    sleepApi: async (delay) => { waits.push(delay); },
    fetchApi: async () => ++calls === 1
      ? new Response("{}", { status: 429, headers: { "Retry-After": "45" } })
      : new Response(JSON.stringify({ key: "fixture/link" })),
  });
  const result = await service.copyUrlToR2("https://image.fixture/photo.jpg", "fixture", "secrets", { onRetry: (message) => statuses.push(message) });
  assert.equal(result.key, "fixture/link");
  assert.deepEqual(waits, [45_000]);
  assert.match(statuses[0], /45 秒后自动继续/);
});
