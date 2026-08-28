import assert from "node:assert/strict";
import test from "node:test";

import { createImageService } from "../modules/image-service.js";
import { createLazyControllerProxy } from "../modules/lazy-controller.js";

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
