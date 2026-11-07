# Shashka — Telegram Mini App

Tasodifiy raqib bilan real vaqtda shashka (rus shashkasi), chat bilan. Backend: Node.js + WebSocket (`ws`).

## Fayllar
- `server.js` — HTTP + WebSocket: matchmaking, xonalar, chat, qayta ulanish
- `lib/game.js` — shashka qoidalari (faqat serverda; mijoz yurishlarni o‘zi hal qilmaydi)
- `lib/telegram.js` — Telegram `initData` imzosini tekshirish (ism/avatar shu yerdan olinadi)
- `public/` — Mini App (index.html, style.css, app.js)
- `test/` — avtomatik testlar (`npm test`)

## Ishga tushirish
```bash
npm install
BOT_TOKEN=123456:ABC... npm start      # http://localhost:3000
```
Telegram Mini App faqat **HTTPS** manzilda ochiladi. Eng oson yo‘l: loyihani GitHub'ga yuklab, Render / Railway / Fly.io'ga deploy qiling (WebSocket qo‘llab-quvvatlanadi). Muhit o‘zgaruvchisi: `BOT_TOKEN`.
Muhim: `BOT_TOKEN` — Mini App'ni ochadigan **aynan o‘sha bot**ning tokeni bo‘lishi kerak.
Server xotirada ishlaydi, shuning uchun bitta nusxa (instance) bilan ishga tushiring.

## Botga ulash (mavjud botingizni buzmasdan)
Menyu tugmasini almashtirish shart emas — botingizga bitta buyruq qo‘shing. WEBAPP_URL = deploy manzilingiz.

aiogram (Python):
```python
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
@dp.message(Command("shashka"))
async def shashka(m):
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="♟ Shashka o‘ynash", web_app=WebAppInfo(url=WEBAPP_URL))]])
    await m.answer("Shashka o‘yini:", reply_markup=kb)
```
Telegraf / grammY (Node):
```js
bot.command('shashka', (ctx) => ctx.reply('Shashka o‘yini:', { reply_markup: { inline_keyboard: [[{ text: '♟ Shashka o‘ynash', web_app: { url: WEBAPP_URL } }]] } }));
```
Istasangiz BotFather → `/newapp` orqali alohida Mini App ham yaratishingiz mumkin.

## Sinash
- Haqiqiy sinov: ikki xil Telegram akkauntdan botdagi tugmani bosing, ikkalasida BATL.
- Telegramsiz tez sinov: `DEV=1 npm run dev`, brauzerda ikki oynada `http://localhost:3000/?dev=Ali` va `/?dev=Vali`. (`DEV=1` ni production'da ishlatmang.)

## Qoidalar
Oq birinchi yuradi; urish majburiy; oddiy shashka orqaga ham uradi; dama uchuvchi; zanjirli urishda davom etish shart; 15 ta ketma-ket dama yurishi (urishsiz) — durang. Raqib uzilsa 30 soniya kutiladi (`GRACE_SECONDS`), qaytmasa g‘alaba beriladi.
