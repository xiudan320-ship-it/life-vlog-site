import assert from "node:assert/strict";
import test from "node:test";
import { createSecretUploadService } from "../modules/secret-upload-service.js";
import { createAssetController } from "../modules/asset-controller.js";

const entries = (count) => Array.from({ length: count }, (_, index) => ({ label: `fixture-${index}.jpg`, source: index }));

test("500 photos checkpoint every ten, continue after bad images, and retry only failures in original order", async () => {
  const calls = new Map();
  const saves = [];
  let retry = false;
  let active = 0;
  let maximumActive = 0;
  const service = createSecretUploadService();
  await service.start({
    entries: entries(500),
    ensureContext() {},
    async upload(index) {
      active++;
      maximumActive = Math.max(maximumActive, active);
      calls.set(index, (calls.get(index) || 0) + 1);
      await Promise.resolve();
      active--;
      if (!retry && [45, 199, 499].includes(index)) throw new Error("fixture unreadable image");
      return { index };
    },
    async save(images) { saves.push(images.map((image) => image.index)); },
  });
  assert.equal(service.snapshot().saved, 497);
  assert.equal(service.snapshot().failed.length, 3);
  assert.deepEqual(saves.map((save) => save.length), [...Array.from({ length: 49 }, (_, index) => (index + 1) * 10), 497]);
  assert.equal(maximumActive, 1, "image decoding is bounded");
  retry = true;
  await service.retry();
  assert.equal(service.snapshot().complete, true);
  assert.deepEqual(saves.at(-1), Array.from({ length: 500 }, (_, index) => index));
  assert.equal([...calls.values()].reduce((sum, count) => sum + count, 0), 503);
});

test("a lost checkpoint response retains assets and retries the same album snapshot without reuploading", async () => {
  let uploads = 0;
  let failSave = true;
  const saves = [];
  const service = createSecretUploadService();
  await service.start({
    entries: entries(25), ensureContext() {},
    async upload(index) { uploads++; return { index }; },
    async save(images) {
      saves.push(images.map((image) => image.index));
      if (failSave) throw new Error("fixture save unavailable");
    },
  });
  assert.equal(uploads, 10);
  assert.equal(service.snapshot().saved, 0);
  assert.equal(service.snapshot().pending, 10);
  assert.equal(service.clear(), false);
  assert.match(service.snapshot().error, /save unavailable/);
  failSave = false;
  await service.retry();
  assert.deepEqual(saves[0], saves[1]);
  assert.equal(uploads, 25);
  assert.equal(service.snapshot().saved, 25);
});

test("single flight includes list refresh and a session change prevents any album write", async () => {
  let resolveUpload;
  let resolveRefresh;
  let sameUser = true;
  let saves = 0;
  const service = createSecretUploadService();
  const options = {
    entries: entries(2),
    ensureContext() { if (!sameUser) throw new Error("fixture session changed"); },
    async upload(index) { await new Promise((resolve) => { resolveUpload = resolve; }); return { index }; },
    async save() { saves++; },
    async onSettled() { await new Promise((resolve) => { resolveRefresh = resolve; }); },
  };
  const run = service.start(options);
  assert.equal(await service.start(options), false);
  assert.equal(service.clear(), false);
  await Promise.resolve();
  sameUser = false;
  resolveUpload();
  for (let turn = 0; turn < 10 && !resolveRefresh; turn++) await Promise.resolve();
  assert.equal(service.canStart(), false);
  resolveRefresh();
  await run;
  assert.equal(saves, 0);
  assert.equal(service.snapshot().pending, 1);
  assert.match(service.snapshot().error, /session changed/);
});

test("secret uploads receive the concrete asset error instead of a generic null result", async () => {
  const assets = createAssetController({
    imageService: { compressImage: async () => { throw new Error("fixture unsupported format"); } },
    setStatus() {},
  });
  await assert.rejects(assets.uploadImageFile({}, "fixture", 1, 1, { throwOnError: true }), /unsupported format/);
});
