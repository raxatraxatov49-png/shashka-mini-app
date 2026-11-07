'use strict';
const crypto = require('crypto');

/**
 * Telegram Mini App initData imzosini tekshiradi.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Muvaffaqiyatli bo'lsa { id, name, avatar } qaytaradi, aks holda null.
 */
function verifyInitData(initData, botToken, maxAgeSec = 86400, now = Date.now()) {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calc = crypto.createHmac('sha256', secret).update(dcs).digest('hex');
  const a = Buffer.from(calc, 'hex'), b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const authDate = Number(params.get('auth_date'));
  if (!authDate || now / 1000 - authDate > maxAgeSec) return null;
  let u;
  try { u = JSON.parse(params.get('user')); } catch { return null; }
  if (!u || !u.id) return null;
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'O‘yinchi';
  const avatar = typeof u.photo_url === 'string' && u.photo_url.startsWith('https://') ? u.photo_url : null;
  return { id: String(u.id), name: name.slice(0, 40), avatar };
}

module.exports = { verifyInitData };
