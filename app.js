  async function ensureFFmpegLoaded(){
    if (ffmpegLoaded) return;
    const { FFmpeg } = window.FFmpegWASM;
    const { toBlobURL } = window.FFmpegUtil;

    const ffmpegBase = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd';
    const classWorkerURL = await toBlobURL(`${ffmpegBase}/814.ffmpeg.js`, 'text/javascript');

    ffmpeg = new FFmpeg({ classWorkerURL });

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
    const coreBaseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegLoaded = true;
  }
