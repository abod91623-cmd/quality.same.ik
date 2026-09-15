# محسّن فيديو تيك توك — تطبيق ويب محلي بالكامل

تطبيق **Client-Side 100%** يعالج الفيديو داخل متصفحك عبر FFmpeg.wasm (WebAssembly).
لا يوجد أي رفع للملفات لأي سيرفر، ولا حاجة لأي باك إند — يعمل مباشرة على GitHub Pages
أو أي استضافة ملفات ثابتة.

## المزايا
- سحب وإفلات الفيديو أو الاختيار اليدوي
- دقة 1080×1920 أو 720×1280
- فريمريت 30 أو 60 fps مضبوط فعلياً في الترميز
- تأثير Motion Blur (دمج إطارات عبر فلتر tmix) بثلاث درجات: خفيف / وسط / قوي
- بيتريت فيديو عالي (6-10M) وصوت 320kbps AAC
- شريط تقدم حقيقي مرتبط بتقدم FFmpeg الفعلي
- معاينة وتحميل الفيديو الناتج مباشرة من المتصفح

## التشغيل محلياً
لازم تشغّل الملفات عبر سيرفر محلي (بسبب قيود CORS على fetch)، مب فتح الملف مباشرة:

```bash
python3 -m http.server 8000
# أو
npx serve .
```

ثم افتح `http://localhost:8000`

## النشر على GitHub Pages
1. ارفع الملفات الأربعة لمستودعك:
```bash
git init
git add index.html styles.css app.js README.md
git commit -m "TikTok video optimizer"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```
2. Settings → Pages → Source: Deploy from a branch → main / (root) → Save
3. بعد دقيقة، افتح: `https://USERNAME.github.io/REPO/`

## ملاحظة تقنية
يُستخدم كور FFmpeg.wasm أحادي الخيط (single-thread) لأنه لا يحتاج ترويسات
`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` التي لا يمكن
ضبطها على GitHub Pages. هذا يعني توافقية كاملة مقابل سرعة معالجة أبطأ قليلاً
على الملفات الكبيرة جداً.

## المتصفحات المدعومة
Chrome, Edge, Firefox (أحدث الإصدارات). متصفحات المتاجر داخل تطبيقات
مثل إنستغرام قد لا تدعم WebAssembly بالشكل الكامل.
