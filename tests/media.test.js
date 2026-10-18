import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createMediaService } from '../server/services/mediaService.js';
test('image upload decodes, re-encodes and strips metadata; fake images and SVG are rejected', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'earthveda-image-'));
  try {
    const service = createMediaService({
      uploadDir: dir,
      db: { collection: () => ({ updateOne: async () => {} }) },
    });
    const input = await sharp({
      create: { width: 10, height: 10, channels: 3, background: '#ff0000' },
    })
      .withMetadata()
      .png()
      .toBuffer();
    const saved = await service.saveImage(input);
    assert.match(saved.url, /^\/uploads\/[a-f0-9]{64}\.webp$/);
    const meta = await sharp(path.join(dir, path.basename(saved.url))).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.exif, undefined);
    await assert.rejects(
      service.saveImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
      /valid, single-frame/,
    );
    await assert.rejects(service.saveImage(Buffer.from('RIFFxxxxWEBPjunk')), /valid, single-frame/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
