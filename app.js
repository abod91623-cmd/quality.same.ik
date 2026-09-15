(() => {
  'use strict';

  const dropzone       = document.getElementById('dropzone');
  const fileInput      = document.getElementById('fileInput');
  const fileInfo       = document.getElementById('fileInfo');
  const fileNameEl     = document.getElementById('fileName');
  const fileMetaEl     = document.getElementById('fileMeta');
  const removeFileBtn  = document.getElementById('removeFile');

  const settingsPanel  = document.getElementById('settingsPanel');
  const resButtons     = document.querySelectorAll('.res-btn');
  const fpsButtons     = document.querySelectorAll('.fps-btn');
  const intensityBtns  = document.querySelectorAll('.intensity-btn');
  const motionBlurToggle        = document.getElementById('motionBlurToggle');
  const motionBlurIntensityWrap = document.getElementById('motionBlurIntensityWrap');

  const settingsSummary = document.getElementById('settingsSummary');
  const processBtn      = document.getElementById('processBtn');

  const progressSection = document.getElementById('progressSection');
  const progressBar     = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const progressStatus  = document.getElementById('progressStatus');

  const downloadSection   = document.getElementById('downloadSection');
  const outputPreview     = document.getElementById('outputPreview');
  const outputMeta        = document.getElementById('outputMeta');
  const downloadBtn       = document.getElementById('downloadBtn');
  const processAnotherBtn = document.getElementById('processAnotherBtn');

  let selectedFile = null;
  let ffmpeg = null;
  let ffmpegLoaded = false;
  let objectUrlForOutput = null;

  let state = {
    resolution: '1080x1920',
    fps: '60',
    motionBlur: false,
    motionBlurLevel: 'medium',
  };

  const MOTION_BLUR_FRAMES = { light: 2, medium: 3, strong: 5 };

  function bytesToSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes)/Math.log(1024));
    return `${(bytes/Math.pow(1024,i)).toFixed(1)} ${units[i]}`;
  }
  function show(el){ el.classList.remove('hidden'); el.classList.add('fade-in'); }
  function hide(el){ el.classList.add('hidden'); el.classList.remove('fade-in'); }
  function setProgress(pct, text){
    const c = Math.max(0, Math.min(100, pct));
    progressBar.style.width = `${c}%`;
    progressPercent.textContent = `${c.toFixed(0)}%`;
    if (text) progressStatus.textContent = text;
  }

  dropzone.addEventListener('click', () => fileInput.click());
  ['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation(); dropzone.classList.add('drag-active');
  }));
  ['dragleave','dragend'].forEach(evt => dropzone.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('drag-active');
  }));
  dropzone.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.remove('drag-active');
    if (e.dataTransfer.files && e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files.length) handleFileSelect(e.target.files[0]);
  });
  removeFileBtn.addEventListener('click', resetToUpload);

  function handleFileSelect(file){
    if (!file.type.startsWith('video/')){ alert('الرجاء اختيار ملف فيديو صالح.'); return; }
    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileMetaEl.textContent = `${bytesToSize(file.size)} · ${file.type || 'video'}`;
    show(fileInfo); show(settingsPanel);
    updateSummary();
    settingsPanel.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
  function resetToUpload(){
    selectedFile = null; fileInput.value = '';
    hide(fileInfo); hide(settingsPanel); hide(progressSection); hide(downloadSection);
  }

  resButtons.forEach(btn => btn.addEventListener('click', () => {
    resButtons.forEach(b => b.classList.remove('active','border-sky-400','bg-sky-400/10','text-sky-300'));
    btn.classList.add('active','border-sky-400','bg-sky-400/10','text-sky-300');
    state.resolution = btn.dataset.res;
    updateSummary();
  }));
  fpsButtons.forEach(btn => btn.addEventListener('click', () => {
    fpsButtons.forEach(b => b.classList.remove('active','border-emerald-400','bg-emerald-400/10','text-emerald-300'));
    btn.classList.add('active','border-emerald-400','bg-emerald-400/10','text-emerald-300');
    state.fps = btn.dataset.fps;
    updateSummary();
  }));
  motionBlurToggle.addEventListener('click', () => {
    state.motionBlur = !state.motionBlur;
    motionBlurToggle.classList.toggle('active', state.motionBlur);
    motionBlurIntensityWrap.classList.toggle('opacity-40', !state.motionBlur);
    motionBlurIntensityWrap.classList.toggle('pointer-events-none', !state.motionBlur);
    updateSummary();
  });
  intensityBtns.forEach(btn => btn.addEventListener('click', () => {
    intensityBtns.forEach(b => b.classList.remove('active','border-sky-400','bg-sky-400/10','text-sky-300'));
    btn.classList.add('active','border-sky-400','bg-sky-400/10','text-sky-300');
    state.motionBlurLevel = btn.dataset.intensity;
    updateSummary();
  }));

  function updateSummary(){
    const res = state.resolution.replace('x','×');
    const blur = state.motionBlur ? `، موشن بلور (${
      state.motionBlurLevel === 'light' ? 'خفيف' : state.motionBlurLevel === 'strong' ? 'قوي' : 'وسط'
    })` : '';
    settingsSummary.textContent = `التصدير بدقة ${res} · ${state.fps} فريم/ثانية${blur}`;
  }
  updateSummary();

  // ---- تحميل FFmpeg.wasm من CDN عبر Blob URLs ----
  // كل ملف (core.js / core.wasm / سكربت الـ Worker الداخلي 814.ffmpeg.js)
  // يُجلب أولاً كـ Blob في الذاكرة (fetch + URL.createObjectURL) قبل تمريره.
  // هذا يحوّله لمصدر "محلي" من منظور المتصفح، فيتجاوز قيد Cross-Origin Worker
  // نهائياً دون الحاجة لاستضافة أي ملف فعلياً على سيرفرك.
  async function ensureFFmpegLoaded(){
    if (ffmpegLoaded) return;
    const { FFmpeg } = window.FFmpegWASM;
    const { toBlobURL } = window.FFmpegUtil;

    ffmpeg = new FFmpeg();

    ffmpeg.on('log', ({ message }) => {
      console.log('[ffmpeg]', message);
      progressStatus.textContent = message;
    });
    ffmpeg.on('progress', ({ progress }) => {
      if (typeof progress === 'number' && !Number.isNaN(progress)) {
        setProgress(Math.min(100, Math.max(0, progress*100)), progressStatus.textContent);
      }
    });

    setProgress(0, 'جاري تحميل محرك المعالجة (أول مرة فقط)…');

    const coreBaseURL   = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpegBaseURL = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd';

    const [coreURL, wasmURL, classWorkerURL] = await Promise.all([
      toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript'),
      toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      toBlobURL(`${ffmpegBaseURL}/814.ffmpeg.js`, 'text/javascript'),
    ]);

    await ffmpeg.load({ coreURL, wasmURL, classWorkerURL });

    ffmpegLoaded = true;
  }

  function buildFilterChain(s){
    const filters = [];
    const [w,h] = s.resolution.split('x');
    filters.push(`scale=${w}:${h}:force_original_aspect_ratio=decrease`);
    filters.push(`pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black`);
    filters.push(`fps=${s.fps}`);
    if (s.motionBlur){
      const frames = MOTION_BLUR_FRAMES[s.motionBlurLevel] || 3;
      const weights = frames === 2 ? '1 1' : frames === 3 ? '1 2 1' : '1 2 3 2 1';
      filters.push(`tmix=frames=${frames}:weights=${weights}`);
    }
    filters.push('format=yuv420p');
    return filters.join(',');
  }

  function buildFFmpegArgs(inputName, outputName, s){
    const vf = buildFilterChain(s);
    const vBitrate = s.resolution === '1080x1920' ? '10M' : '6M';
    const vBufsize = s.resolution === '1080x1920' ? '20M' : '12M';
    return [
      '-i', inputName,
      '-vf', vf,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-profile:v', 'high',
      '-level', '4.2',
      '-b:v', vBitrate,
      '-maxrate', vBitrate,
      '-bufsize', vBufsize,
      '-pix_fmt', 'yuv420p',
      '-g', String(parseInt(s.fps,10) * 2),
      '-c:a', 'aac',
      '-b:a', '320k',
      '-ar', '48000',
      '-movflags', '+faststart',
      outputName,
    ];
  }

  processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    const s = { ...state };

    hide(settingsPanel); hide(downloadSection); show(progressSection);
    setProgress(0, 'جاري التهيئة…');
    processBtn.disabled = true;

    try {
      await ensureFFmpegLoaded();

      const inputExt = (selectedFile.name.split('.').pop() || 'mp4').toLowerCase();
      const inputName = `input.${inputExt}`;
      const outputName = 'output.mp4';

      setProgress(2, 'جاري تحميل الفيديو للذاكرة…');
      const { fetchFile } = window.FFmpegUtil;
      const inputData = await fetchFile(selectedFile);
      await ffmpeg.writeFile(inputName, inputData);

      setProgress(5, 'بدء المعالجة…');
      const args = buildFFmpegArgs(inputName, outputName, s);
      console.log('[ffmpeg args]', args.join(' '));
      await ffmpeg.exec(args);

      setProgress(97, 'جاري إنهاء الملف…');
      const outputData = await ffmpeg.readFile(outputName);

      try { await ffmpeg.deleteFile(inputName); } catch(_) {}
      try { await ffmpeg.deleteFile(outputName); } catch(_) {}

      const blob = new Blob([outputData.buffer], { type: 'video/mp4' });
      if (objectUrlForOutput) URL.revokeObjectURL(objectUrlForOutput);
      objectUrlForOutput = URL.createObjectURL(blob);

      setProgress(100, 'تم!');
      outputPreview.src = objectUrlForOutput;
      outputMeta.textContent = `${bytesToSize(blob.size)} · ${s.resolution.replace('x','×')} · ${s.fps} فريم${s.motionBlur ? ' · موشن بلور ' + s.motionBlurLevel : ''}`;
      downloadBtn.href = objectUrlForOutput;
      const cleanName = (selectedFile.name.replace(/\.[^/.]+$/, '') || 'video');
      downloadBtn.setAttribute('download', `${cleanName}-tiktok-optimized.mp4`);

      hide(progressSection); show(downloadSection);
      downloadSection.scrollIntoView({ behavior:'smooth', block:'nearest' });

    } catch (err) {
      console.error('Processing error:', err);
      const detail = (err && (err.message || err.toString())) || 'خطأ غير معروف';
      alert(`صار خطأ أثناء المعالجة:\n\n${detail}`);
      hide(progressSection); show(settingsPanel);
    } finally {
      processBtn.disabled = false;
    }
  });

  processAnotherBtn.addEventListener('click', () => {
    hide(downloadSection); resetToUpload();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

})();
