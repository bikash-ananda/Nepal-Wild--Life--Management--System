import test from "node:test";
import assert from "node:assert/strict";
import { preparePhotoUpload } from "./preparePhotoUpload.js";

test("photo preparation scales large images, re-encodes them, and releases the bitmap", async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const previousBitmap = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
  let drawArgs;
  let closed = false;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: (...args) => { drawArgs = args; } }),
    toBlob: (callback, type) => callback(new Blob(["compressed"], { type })),
  };
  globalThis.document = { createElement: () => canvas };
  globalThis.createImageBitmap = async () => ({ width: 4000, height: 2000, close: () => { closed = true; } });

  try {
    const source = new File(["source"], "wildlife.png", { type: "image/png" });
    const prepared = await preparePhotoUpload(source);
    assert.equal(canvas.width, 0);
    assert.equal(canvas.height, 0);
    assert.equal(drawArgs[3], 1600);
    assert.equal(drawArgs[4], 800);
    assert.equal(prepared.type, "image/webp");
    assert.equal(prepared.name, "wildlife.webp");
    assert.equal(prepared.size, 10);
    assert.equal(closed, true);
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else delete globalThis.document;
    if (previousBitmap) Object.defineProperty(globalThis, "createImageBitmap", previousBitmap);
    else delete globalThis.createImageBitmap;
  }
});

test("photo preparation rejects unsupported formats", async () => {
  await assert.rejects(
    preparePhotoUpload(new File(["svg"], "wildlife.svg", { type: "image/svg+xml" })),
    /Choose a JPG, PNG, or WebP photo/
  );
});
