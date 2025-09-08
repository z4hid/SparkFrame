import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Modality } from '@google/genai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const app = express();
app.use(cors());
// Increase body limits to support large base64 images for editing/export
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('[server] Missing GEMINI_API_KEY; API routes will fail.');
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const IMAGE_MODEL = 'gemini-2.5-flash-image-preview';
const TEXT_MODEL = 'gemini-2.5-flash';

// Generated files directory
const GENERATED_DIR = path.resolve(process.cwd(), 'generated');
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}
app.use('/generated', express.static(GENERATED_DIR));

// Cache directory for deterministic duplicates
const CACHE_DIR = path.join(GENERATED_DIR, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const saveImageToDisk = (base64, preferPng = true) => {
  const filename = `img-${Date.now()}.png`; // enforce .png per requirement
  const filePath = path.join(GENERATED_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  const fileUrl = `/generated/${filename}`;
  return { filePath, fileUrl, filename };
};

// Simple concurrency limiter
let inflight = 0;
const MAX_CONCURRENCY = 2;
const limitConcurrency = async (fn) => {
  while (inflight >= MAX_CONCURRENCY) {
    await new Promise(r => setTimeout(r, 50));
  }
  inflight += 1;
  try { return await fn(); } finally { inflight -= 1; }
};

const stableHash = (input) => crypto.createHash('sha1').update(input).digest('hex');
const tryReadCache = (hash) => {
  const filePath = path.join(CACHE_DIR, `${hash}.png`);
  if (fs.existsSync(filePath)) {
    const base64 = fs.readFileSync(filePath).toString('base64');
    return { base64, mimeType: 'image/png', fileUrl: `/generated/cache/${hash}.png` };
  }
  return null;
};
const writeCache = (hash, base64) => {
  const filePath = path.join(CACHE_DIR, `${hash}.png`);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return { fileUrl: `/generated/cache/${hash}.png` };
};

// Nano Banana best-practice prompt booster (concise)
const BEST_PRACTICES_GUIDE = `
Best practices:
- Be hyper-specific about setting, mood, lighting, camera, and materials.
- Provide purpose/context; maintain character consistency when blueprints provided.
- Iterate in small steps; keep character unchanged unless specified.
- Use photographic/cinematic language (wide-angle, macro, low-angle, 85mm portrait lens, Dutch angle).
- Use semantic negatives for cleanliness: no watermark, no text overlays, no extra limbs, no distortions, no signature.
`;

// --- Simple in-memory usage counters (per-process) ---
// limits: 20 images/minute, 200 requests/day per project
const LIMITS = { imagesPerMinute: 20, requestsPerDay: 200 };
let dailyWindowStart = Date.now();
let requestsToday = 0;
let minuteWindowStart = Date.now();
let imagesThisMinute = 0;

const resetIfNeeded = () => {
  const now = Date.now();
  if (now - dailyWindowStart >= 24 * 60 * 60 * 1000) {
    dailyWindowStart = now;
    requestsToday = 0;
  }
  if (now - minuteWindowStart >= 60 * 1000) {
    minuteWindowStart = now;
    imagesThisMinute = 0;
  }
};

const usageSnapshot = () => {
  resetIfNeeded();
  const now = Date.now();
  const minuteResetInSeconds = Math.max(0, Math.ceil((60 * 1000 - (now - minuteWindowStart)) / 1000));
  const dailyResetInSeconds = Math.max(0, Math.ceil((24 * 60 * 60 * 1000 - (now - dailyWindowStart)) / 1000));
  return {
    requestsToday,
    requestsPerDayLimit: LIMITS.requestsPerDay,
    imagesThisMinute,
    imagesPerMinuteLimit: LIMITS.imagesPerMinute,
    minuteResetInSeconds,
    dailyResetInSeconds,
  };
};

// Public endpoint to read current usage
app.get('/api/usage', (_req, res) => {
  res.json(usageSnapshot());
});

// Guard and increment counters before calling Gemini
const trackUsage = (type /** 'image' | 'text' */) => {
  resetIfNeeded();
  const isImage = type === 'image';
  if (requestsToday >= LIMITS.requestsPerDay) {
    const snapshot = usageSnapshot();
    const err = new Error('daily_limit_exceeded');
    // @ts-ignore
    err.status = 429;
    // @ts-ignore
    err.meta = snapshot;
    throw err;
  }
  if (isImage) {
    if (imagesThisMinute >= LIMITS.imagesPerMinute) {
      const snapshot = usageSnapshot();
      const err = new Error('minute_image_limit_exceeded');
      // @ts-ignore
      err.status = 429;
      // @ts-ignore
      err.meta = snapshot;
      throw err;
    }
    imagesThisMinute += 1;
  }
  requestsToday += 1;
};

const respondRateLimited = (res, err) => {
  const status = err.status || 429;
  const meta = err.meta || usageSnapshot();
  res.status(status)
    .set({
      'X-Usage-Requests-Today': String(meta.requestsToday),
      'X-Usage-Requests-Limit': String(meta.requestsPerDayLimit),
      'X-Usage-Images-Minute': String(meta.imagesThisMinute),
      'X-Usage-Images-Minute-Limit': String(meta.imagesPerMinuteLimit),
      'X-Usage-Second-Reset-Minute': String(meta.minuteResetInSeconds),
      'X-Usage-Second-Reset-Day': String(meta.dailyResetInSeconds),
    })
    .json({ error: err.message || 'rate_limited', usage: meta });
};

app.post('/api/text', async (req, res) => {
  try {
    trackUsage('text');
    const { prompt } = req.body;
    const response = await ai.models.generateContent({ model: TEXT_MODEL, contents: prompt });
    const meta = usageSnapshot();
    res
      .set({
        'X-Usage-Requests-Today': String(meta.requestsToday),
        'X-Usage-Requests-Limit': String(meta.requestsPerDayLimit),
      })
      .json({ text: response.text || '' });
  } catch (err) {
    if (err && (err.status === 429)) return respondRateLimited(res, err);
    console.error('text error', err);
    res.status(500).json({ error: 'text_failed' });
  }
});

app.post('/api/generateImage', async (req, res) => {
  try {
    trackUsage('image');
    const { prompt, characters = [], styleImages = null } = req.body;
    const characterBlueprints = characters.length
      ? characters.map(c => `Character Name: ${c.name}\nCharacter Blueprint: ${c.profile}\n---`).join('\n\n')
      : '';
    const scenePrompt = `${BEST_PRACTICES_GUIDE}\n\nTask: Generate a single, high-quality, cinematic image for a visual narrative.\n\nScene Description: "${prompt}"\n\n${characters.length ? 'The following characters appear in this scene. Adhere STRICTLY to their blueprints.' : ''}\n${characterBlueprints}\n\nStyle Guidelines: Use precise camera/lighting/composition language. Favor realistic anatomy and clean outputs. Avoid text artifacts.`;

    let contents = scenePrompt;
    if (Array.isArray(styleImages) && styleImages.length > 0) {
      const parts = [
        { text: 'Use the following image(s) ONLY as artistic style references. Emulate palette/lighting/texture. Do NOT copy content. Then render the described scene.' }
      ];
      for (const img of styleImages) {
        if (img?.base64 && img?.mimeType) {
          parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
        }
      }
      parts.push({ text: scenePrompt });
      contents = { parts };
    }

    // Cache key based on full input surface
    const key = stableHash(JSON.stringify({ prompt, characters, styleImages }));
    const cached = tryReadCache(key);
    if (cached) {
      const meta = usageSnapshot();
      return res
        .set({
          'X-Cache': 'HIT',
          'X-Usage-Requests-Today': String(meta.requestsToday),
          'X-Usage-Requests-Limit': String(meta.requestsPerDayLimit),
          'X-Usage-Images-Minute': String(meta.imagesThisMinute),
          'X-Usage-Images-Minute-Limit': String(meta.imagesPerMinuteLimit),
        })
        .json({ base64Image: cached.base64, mimeType: cached.mimeType, fileUrl: cached.fileUrl });
    }

    const response = await limitConcurrency(() => ai.models.generateContent({ model: IMAGE_MODEL, contents, config: { responseModalities: [Modality.IMAGE, Modality.TEXT] } }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        // save to disk and return a public URL
        const saved = saveImageToDisk(part.inlineData.data);
        writeCache(key, part.inlineData.data);
        const meta = usageSnapshot();
        return res
          .set({
            'X-Usage-Requests-Today': String(meta.requestsToday),
            'X-Usage-Requests-Limit': String(meta.requestsPerDayLimit),
            'X-Usage-Images-Minute': String(meta.imagesThisMinute),
            'X-Usage-Images-Minute-Limit': String(meta.imagesPerMinuteLimit),
          })
          .json({ base64Image: part.inlineData.data, mimeType: part.inlineData.mimeType, fileUrl: saved.fileUrl });
      }
    }
    res.status(500).json({ error: 'image_failed' });
  } catch (err) {
    if (err && (err.status === 429)) return respondRateLimited(res, err);
    console.error('generateImage error', err);
    res.status(500).json({ error: 'image_failed' });
  }
});

app.post('/api/editImage', async (req, res) => {
  try {
    trackUsage('image');
    const { prompt, base64Image, mimeType, sourceUrl, characters = [] } = req.body;
    const locked = characters.filter(c => c.identityLocked);
    const blueprintText = locked.length
      ? 'Reference the following character blueprints to maintain visual consistency for locked characters:\n' + locked.map(c => `Character: ${c.name}\nBlueprint: ${c.profile}\n---`).join('\n')
      : '';
    const fullPrompt = `${BEST_PRACTICES_GUIDE}\n\n${prompt}.\n${blueprintText}`;
    let imageBase64 = base64Image;
    let mt = mimeType;
    // If a sourceUrl under /generated is provided, read from disk to avoid large payloads
    if (!imageBase64 && sourceUrl && sourceUrl.startsWith('/generated/')) {
      const filePath = path.join(GENERATED_DIR, sourceUrl.replace('/generated/', ''));
      const buff = fs.readFileSync(filePath);
      imageBase64 = buff.toString('base64');
      mt = 'image/png';
    }
    const contents = { parts: [{ text: fullPrompt }, { inlineData: { data: imageBase64, mimeType: mt || 'image/png' } }] };
    const response = await ai.models.generateContent({ model: IMAGE_MODEL, contents, config: { responseModalities: [Modality.IMAGE, Modality.TEXT] } });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const saved = saveImageToDisk(part.inlineData.data);
        const meta = usageSnapshot();
        return res
          .set({
            'X-Usage-Requests-Today': String(meta.requestsToday),
            'X-Usage-Requests-Limit': String(meta.requestsPerDayLimit),
            'X-Usage-Images-Minute': String(meta.imagesThisMinute),
            'X-Usage-Images-Minute-Limit': String(meta.imagesPerMinuteLimit),
          })
          .json({ base64Image: part.inlineData.data, mimeType: part.inlineData.mimeType, fileUrl: saved.fileUrl });
      }
    }
    res.status(500).json({ error: 'edit_failed' });
  } catch (err) {
    if (err && (err.status === 429)) return respondRateLimited(res, err);
    console.error('editImage error', err);
    res.status(500).json({ error: 'edit_failed' });
  }
});

app.post('/api/characterPortrait', async (req, res) => {
  try {
    trackUsage('image');
    const { name, profile } = req.body;
    const prompt = `A cinematic, full-body character portrait of ${name}. Neutral light gray studio background. ${profile}`;
    const response = await ai.models.generateContent({ model: IMAGE_MODEL, contents: prompt, config: { responseModalities: [Modality.IMAGE, Modality.TEXT] } });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const saved = saveImageToDisk(part.inlineData.data);
        const meta = usageSnapshot();
        return res
          .set({
            'X-Usage-Requests-Today': String(meta.requestsToday),
            'X-Usage-Requests-Limit': String(meta.requestsPerDayLimit),
            'X-Usage-Images-Minute': String(meta.imagesThisMinute),
            'X-Usage-Images-Minute-Limit': String(meta.imagesPerMinuteLimit),
          })
          .json({ base64Image: part.inlineData.data, mimeType: part.inlineData.mimeType, fileUrl: saved.fileUrl });
      }
    }
    res.status(500).json({ error: 'portrait_failed' });
  } catch (err) {
    if (err && (err.status === 429)) return respondRateLimited(res, err);
    console.error('portrait error', err);
    res.status(500).json({ error: 'portrait_failed' });
  }
});

app.post('/api/createProfile', async (req, res) => {
  try {
    trackUsage('text');
    const { images = [], name, description } = req.body;
    const imageParts = images.map(img => ({ inlineData: { data: img.base64Image, mimeType: img.mimeType } }));
    const prompt = `You are a character design expert. Create a detailed Character Blueprint for ${name}. User description: "${description}". Provide descriptors for face, physique, attire, color palette, identifiers as a concise but comprehensive paragraph.`;
    const contents = { parts: [...imageParts, { text: prompt }] };
    const response = await ai.models.generateContent({ model: TEXT_MODEL, contents });
    const meta = usageSnapshot();
    res
      .set({
        'X-Usage-Requests-Today': String(meta.requestsToday),
        'X-Usage-Requests-Limit': String(meta.requestsPerDayLimit),
      })
      .json({ text: response.text || '' });
  } catch (err) {
    if (err && (err.status === 429)) return respondRateLimited(res, err);
    console.error('createProfile error', err);
    res.status(500).json({ error: 'profile_failed' });
  }
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});


