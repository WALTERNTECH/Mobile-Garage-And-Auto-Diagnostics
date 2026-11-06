export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(path, { method = 'GET', body, headers = {}, raw } = {}) {
  const init = { method, headers: { 'X-MG-Admin': '1', ...headers }, credentials: 'same-origin' };
  if (raw) init.body = raw;
  else if (body !== undefined) { init.body = JSON.stringify(body); init.headers['Content-Type'] = 'application/json'; }
  let r;
  try { r = await fetch(`/api/${path}`, init); } catch { throw new ApiError(0, 'Network problem. Check your connection and try again.'); }
  const data = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && !['login', 'session', 'setup', 'password'].includes(path)) onUnauthorized();
    throw new ApiError(r.status, data?.error || `Request failed (${r.status})`);
  }
  return data;
}

export const get = (p) => api(p);
export const post = (p, body) => api(p, { method: 'POST', body: body ?? {} });
export const patch = (p, body) => api(p, { method: 'PATCH', body });
export const put = (p, body) => api(p, { method: 'PUT', body });
export const del = (p) => api(p, { method: 'DELETE' });

export const imgUrl = (id) => `/api/img/${id}`;

// Resize in the browser before upload: longest side 2000px, WebP (JPEG where WebP encoding is missing).
export async function compressImage(file, { max = 2000, quality = 0.82 } = {}) {
  if (!/^image\//.test(file.type)) throw new Error(`${file.name} is not an image.`);
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  let blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
  if (!blob) throw new Error(`Could not process ${file.name}.`);
  return { blob, width: w, height: h };
}

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back */ }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not read ${file.name}. Try a JPEG or PNG.`));
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadImage(file, alt = '') {
  const { blob, width, height } = await compressImage(file);
  const niceAlt = alt || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 120);
  return api('images', {
    method: 'POST',
    raw: blob,
    headers: { 'Content-Type': 'application/octet-stream', 'X-Width': String(width), 'X-Height': String(height), 'X-Alt': encodeURIComponent(niceAlt) },
  });
}
