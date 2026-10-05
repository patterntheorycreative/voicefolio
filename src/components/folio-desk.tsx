import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AudioLines,
  Check,
  Copy,
  Download,
  ImagePlus,
  Mic,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { loadClips, saveClips, titleFrom, type Clip, type ClipKind } from "@/lib/clips";
import { blobToWav } from "@/lib/wav";

const MAX_AUDIO = 3.6 * 1024 * 1024;
const MAX_RECORD_SECONDS = 8 * 60;

const LANGUAGES = [
  ["auto", "Detect language"],
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["it", "Italian"],
  ["nl", "Dutch"],
  ["pl", "Polish"],
  ["ru", "Russian"],
  ["uk", "Ukrainian"],
  ["ar", "Arabic"],
  ["hi", "Hindi"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["zh", "Chinese"],
] as const;

const LANGUAGE_NAMES: Record<string, string> = Object.fromEntries(
  LANGUAGES.filter(([code]) => code !== "auto"),
);

type Mode = "voice" | "page";
type Phase = "idle" | "recording" | "working" | "ready" | "error";

type ApiOk = {
  ok: true;
  text: string;
  language?: string;
  duration?: number;
  speakers?: number;
};

type ApiErr = { ok: false; error?: string; code?: string };

export function FolioDesk() {
  const [mode, setMode] = useState<Mode>("voice");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ language?: string; duration?: number; speakers?: number }>({});
  const [language, setLanguage] = useState("auto");
  const [diarize, setDiarize] = useState(true);
  const [keyterms, setKeyterms] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const optsRef = useRef({ language, diarize, keyterms });
  optsRef.current = { language, diarize, keyterms };
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const sendRef = useRef<(file: File) => void>(() => {});

  useEffect(() => {
    setClips(loadClips());
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const handle = window.setTimeout(() => {
      setClips((current) => {
        const next = current.map((clip) =>
          clip.id === activeId ? { ...clip, text: draft, title: titleFrom(draft, clip.kind) } : clip,
        );
        saveClips(next);
        return next;
      });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [draft, activeId]);

  useEffect(() => {
    if (phase !== "recording") return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_RECORD_SECONDS) stopRef.current();
    }, 200);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "recording") return;
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      analyser.getByteFrequencyData(bins);
      const bars = 32;
      const gap = 3;
      const barWidth = (width - gap * (bars - 1)) / bars;
      ctx.fillStyle = getComputedStyle(canvas).color;
      for (let i = 0; i < bars; i += 1) {
        const value = bins[Math.floor((i / bars) * bins.length)] / 255;
        const barHeight = Math.max(3, value * height);
        const x = i * (barWidth + gap);
        ctx.fillRect(x, (height - barHeight) / 2, Math.max(1, barWidth), barHeight);
      }
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioCtxRef.current?.close();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
    // release only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function remember(kind: ClipKind, text: string, extra?: Partial<Clip>) {
    const clip: Clip = {
      id: crypto.randomUUID(),
      kind,
      title: titleFrom(text, kind),
      text,
      createdAt: Date.now(),
      ...extra,
    };
    setClips((current) => {
      const next = [clip, ...current].slice(0, 16);
      saveClips(next);
      return next;
    });
    setActiveId(clip.id);
    setDraft(text);
    setPhase("ready");
    setError("");
  }

  async function sendAudio(file: File, triedWav = false) {
    if (file.size > MAX_AUDIO) {
      setPhase("error");
      setError("That audio is over 4 MB. Use a shorter take or a compressed MP3.");
      setStatus("");
      return;
    }

    setPhase("working");
    setStatus(triedWav ? "Converting, then transcribing…" : "Transcribing…");
    setError("");

    const opts = optsRef.current;
    const body = new FormData();
    body.append("file", file);
    body.append("language", opts.language);
    body.append("diarize", opts.diarize ? "true" : "false");
    body.append("keyterms", opts.keyterms);

    let response: Response;
    try {
      response = await fetch("/api/transcribe", { method: "POST", body });
    } catch {
      setPhase("error");
      setStatus("");
      setError("Couldn't reach transcription. Check your connection and try again.");
      return;
    }

    const data = (await response.json().catch(() => null)) as ApiOk | ApiErr | null;
    if (data && data.ok === false && data.code === "format" && !triedWav) {
      try {
        setStatus("Converting audio…");
        const wav = await blobToWav(file);
        await sendAudio(new File([wav], "take.wav", { type: "audio/wav" }), true);
      } catch {
        setPhase("error");
        setStatus("");
        setError("This browser couldn't read that audio. Try MP3, M4A, WAV, or OGG.");
      }
      return;
    }

    if (!response.ok || !data || data.ok === false) {
      setPhase("error");
      setStatus("");
      setError(data && data.ok === false && data.error ? data.error : "Transcription failed.");
      return;
    }

    setMeta({
      language: data.language,
      duration: data.duration,
      speakers: data.speakers,
    });
    setStatus("");
    setVoiceFile(null);
    remember("audio", data.text, {
      duration: data.duration,
      language: data.language,
      speakers: data.speakers,
    });
  }

  sendRef.current = (file: File) => {
    void sendAudio(file);
  };

  async function startRecording() {
    setError("");
    setVoiceFile(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void ctx.close();
        const type = recorder.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size < 64) {
          setPhase("error");
          setStatus("");
          setError("That recording was too short.");
          return;
        }
        sendRef.current(new File([blob], `take.${ext}`, { type }));
      };
      recorderRef.current = recorder;
      recorder.start(200);
      setElapsed(0);
      setPhase("recording");
      setStatus("Listening…");
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioCtxRef.current?.close();
      setPhase("error");
      setStatus("");
      setError("Microphone access was blocked. Allow the mic, or upload a file instead.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderRef.current = null;
  }

  stopRef.current = stopRecording;

  function onRecordClick() {
    if (phase === "recording") stopRecording();
    else if (phase !== "working") void startRecording();
  }

  function takeAudioFile(file: File | undefined) {
    if (!file) return;
    if (file.type.startsWith("image/")) {
      setMode("page");
      takeImageFile(file);
      return;
    }
    setVoiceFile(file);
    setError("");
    setStatus("");
  }

  function takeImageFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(file.name)) {
      setMode("voice");
      takeAudioFile(file);
      return;
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setError("");
    setStatus("");
  }

  async function readPage() {
    if (!imageFile) return;
    setPhase("working");
    setStatus("Reading the page…");
    setError("");
    try {
      const image = await fileToJpegDataUrl(imageFile);
      const response = await fetch("/api/read-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = (await response.json().catch(() => null)) as ApiOk | ApiErr | null;
      if (!response.ok || !data || data.ok === false) {
        setPhase("error");
        setStatus("");
        setError(data && data.ok === false && data.error ? data.error : "Couldn't read that page.");
        return;
      }
      setMeta({});
      setStatus("");
      remember("page", data.text);
    } catch (caught) {
      setPhase("error");
      setStatus("");
      setError(caught instanceof Error ? caught.message : "Couldn't read that page.");
    }
  }

  function openClip(clip: Clip) {
    setActiveId(clip.id);
    setDraft(clip.text);
    setMode(clip.kind === "audio" ? "voice" : "page");
    setMeta({
      language: clip.language,
      duration: clip.duration,
      speakers: clip.speakers,
    });
    setPhase("ready");
    setError("");
    setStatus("");
  }

  function removeClip(id: string) {
    setClips((current) => {
      const next = current.filter((clip) => clip.id !== id);
      saveClips(next);
      return next;
    });
    if (activeId === id) {
      setActiveId(null);
      setDraft("");
      setMeta({});
      setPhase("idle");
    }
  }

  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Copy was blocked by the browser.");
    }
  }

  function downloadDraft() {
    if (!draft) return;
    const blob = new Blob([draft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug(titleFrom(draft, mode === "voice" ? "audio" : "page"))}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearSheet() {
    setDraft("");
    setActiveId(null);
    setMeta({});
    setPhase("idle");
    setError("");
    setStatus("");
    setVoiceFile(null);
  }

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const busy = phase === "working";
  const metaLine = describeMeta(meta, wordCount);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 h-1 w-16 bg-ember" aria-hidden="true" />
      <header className="max-w-2xl">
        <p className="text-sm font-medium tracking-widest text-ember uppercase">Desk</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-balance sm:text-5xl">Folio</h1>
        <p className="mt-3 max-w-xl text-pretty text-muted">
          Turn speech into text, or pull the words off a photo with OCR.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="What to read"
        className="mt-8 inline-flex rounded-full border border-line bg-sheet p-1"
      >
        <Tab selected={mode === "voice"} onClick={() => setMode("voice")}>
          Voice
        </Tab>
        <Tab selected={mode === "page"} onClick={() => setMode("page")}>
          Page OCR
        </Tab>
      </div>
      <p className="mt-3 max-w-xl text-sm text-pretty text-muted">
        {mode === "voice"
          ? "Record, or drop an MP3, M4A, WAV, or OGG under 4 MB. Speech becomes a transcript you can edit."
          : "Photograph a page, slide, receipt, whiteboard, or screenshot. OCR copies the letters it can see."}
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-sheet p-5 sm:p-6">
          {mode === "voice" ? (
            <div>
              <p className="text-xs font-medium tracking-widest text-muted uppercase">Take</p>
              <div className="mt-5 flex flex-col items-center">
                <button
                  type="button"
                  onClick={onRecordClick}
                  disabled={busy}
                  aria-pressed={phase === "recording"}
                  className={`grid size-24 place-items-center rounded-full bg-ember text-sheet transition-colors duration-200 hover:bg-ink disabled:opacity-40 ${
                    phase === "recording" ? "folio-pulse" : ""
                  }`}
                >
                  {phase === "recording" ? (
                    <Square className="size-7" fill="currentColor" aria-hidden="true" />
                  ) : (
                    <Mic className="size-8" aria-hidden="true" />
                  )}
                  <span className="sr-only">{phase === "recording" ? "Stop recording" : "Start recording"}</span>
                </button>
                <p className="mt-3 font-medium tabular-nums">
                  {phase === "recording" ? clock(elapsed) : phase === "working" ? "Working" : "Record"}
                </p>
                <p className="text-sm text-muted">
                  {phase === "recording" ? "Tap again to stop and transcribe" : "Tap to capture speech"}
                </p>
              </div>

              {phase === "recording" ? (
                <canvas ref={canvasRef} className="mt-5 h-16 w-full text-ember" aria-hidden="true" />
              ) : null}

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/")) {
                    setMode("page");
                    takeImageFile(file);
                  } else {
                    takeAudioFile(file);
                  }
                }}
                className={`mt-6 rounded-2xl border border-dashed px-4 py-5 text-center ${
                  dragOver ? "border-ember" : "border-line"
                }`}
              >
                <Upload className="mx-auto size-5 text-muted" aria-hidden="true" />
                <p className="mt-2 text-sm">Drop an audio file</p>
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={busy || phase === "recording"}
                  className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-medium hover:border-ink disabled:opacity-40"
                >
                  Choose a file
                </button>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.ogg,.flac,.aac,.opus,.webm,.mp4,.mkv"
                  className="sr-only"
                  onChange={(event) => {
                    takeAudioFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                {voiceFile ? (
                  <p className="mt-3 truncate text-sm text-muted">
                    {voiceFile.name} · {formatBytes(voiceFile.size)}
                  </p>
                ) : null}
              </div>

              {voiceFile ? (
                <button
                  type="button"
                  onClick={() => void sendAudio(voiceFile)}
                  disabled={busy}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ember text-sm font-medium text-sheet hover:bg-ink disabled:opacity-40"
                >
                  <AudioLines className="size-4" aria-hidden="true" />
                  Transcribe
                </button>
              ) : null}

              <details className="mt-5">
                <summary className="text-sm text-muted">Language, speakers, names</summary>
                <div className="mt-4 grid gap-4">
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Language</span>
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="h-11 rounded-full border border-line bg-sheet px-4"
                    >
                      {LANGUAGES.map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="block font-medium">Label speakers</span>
                      <span className="text-muted">When more than one person talks</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={diarize}
                      onChange={(event) => setDiarize(event.target.checked)}
                      className="size-5 accent-ember"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Names to catch</span>
                    <input
                      value={keyterms}
                      onChange={(event) => setKeyterms(event.target.value)}
                      placeholder="Acme, Dr. Okonkwo"
                      className="h-11 rounded-full border border-line bg-sheet px-4 placeholder:text-muted"
                    />
                  </label>
                </div>
              </details>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium tracking-widest text-muted uppercase">Page</p>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file && !file.type.startsWith("image/")) {
                    setMode("voice");
                    takeAudioFile(file);
                  } else {
                    takeImageFile(file);
                  }
                }}
                className={`mt-5 overflow-hidden rounded-2xl border border-dashed ${
                  dragOver ? "border-ember" : "border-line"
                }`}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Page to read" className="max-h-72 w-full object-contain" />
                ) : (
                  <div className="px-4 py-10 text-center">
                    <ImagePlus className="mx-auto size-6 text-muted" aria-hidden="true" />
                    <p className="mt-3 text-sm">Drop a photo of text</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-medium hover:border-ink disabled:opacity-40"
                >
                  Choose a photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const input = imageInputRef.current;
                    if (!input) return;
                    input.setAttribute("capture", "environment");
                    input.click();
                    input.removeAttribute("capture");
                  }}
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-medium hover:border-ink disabled:opacity-40"
                >
                  Use camera
                </button>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  takeImageFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              {imageFile ? (
                <p className="mt-3 truncate text-sm text-muted">{imageFile.name}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void readPage()}
                disabled={busy || !imageFile}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ember text-sm font-medium text-sheet hover:bg-ink disabled:opacity-40"
              >
                Read the page
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-sheet p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-widest text-muted uppercase">Manuscript</p>
              <p className="mt-1 truncate text-sm text-muted">{metaLine}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <IconButton label={copied ? "Copied" : "Copy transcript"} onClick={() => void copyDraft()} disabled={!draft}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </IconButton>
              <IconButton label="Download text file" onClick={downloadDraft} disabled={!draft}>
                <Download className="size-4" />
              </IconButton>
            </div>
          </div>

          {busy ? (
            <div className="folio-bar mt-4" aria-hidden="true">
              <span />
            </div>
          ) : (
            <div className="mt-4 h-0.5" />
          )}

          <p className="sr-only" aria-live="polite">
            {status || error}
          </p>
          {status ? <p className="mt-3 text-sm text-muted">{status}</p> : null}
          {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}

          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (phase !== "working" && phase !== "recording") setPhase(event.target.value ? "ready" : "idle");
            }}
            placeholder="The words land here. Edit anything that came out wrong."
            spellCheck
            className="mt-3 min-h-72 w-full resize-y bg-transparent font-serif text-lg leading-relaxed text-ink outline-none placeholder:text-muted"
          />

          {draft ? (
            <button
              type="button"
              onClick={clearSheet}
              className="mt-2 text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink"
            >
              Clear sheet
            </button>
          ) : null}
        </section>
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-2xl tracking-tight">Earlier</h2>
        <p className="mt-1 text-sm text-muted">Kept on this device only.</p>
        {clips.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted">
            Nothing set yet. A transcript you make will wait here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-sheet">
            {clips.map((clip) => (
              <li key={clip.id} className="flex items-center gap-3 px-3 py-2">
                <button
                  type="button"
                  onClick={() => openClip(clip)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-paper"
                >
                  <span className="w-14 shrink-0 text-xs font-medium tracking-wide text-muted uppercase">
                    {clip.kind === "audio" ? "Voice" : "Page"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{clip.title}</span>
                    <span className="block text-sm text-muted">
                      {formatDistanceToNow(clip.createdAt, { addSuffix: true })}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeClip(clip.id)}
                  aria-label={`Delete ${clip.title}`}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-ember"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Tab({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`h-11 rounded-full px-5 text-sm font-medium ${
        selected ? "bg-ink text-sheet" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-11 place-items-center rounded-full border border-line text-ink hover:border-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function clock(seconds: number): string {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function slug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return cleaned || "folio";
}

function describeMeta(
  meta: { language?: string; duration?: number; speakers?: number },
  words: number,
): string {
  const parts: string[] = [];
  if (meta.duration && meta.duration > 0) parts.push(clock(meta.duration));
  if (meta.language) {
    const code = meta.language.toLowerCase().split("-")[0];
    parts.push(LANGUAGE_NAMES[code] ?? meta.language);
  }
  if (meta.speakers && meta.speakers > 1) parts.push(`${meta.speakers} speakers`);
  if (words > 0) parts.push(`${words} ${words === 1 ? "word" : "words"}`);
  return parts.join(" · ") || "Waiting for words";
}

async function fileToJpegDataUrl(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Couldn't open that image. Use a JPEG or PNG.");
  }
  try {
    const passes = [
      { edge: 1600, quality: 0.86 },
      { edge: 1280, quality: 0.72 },
      { edge: 1024, quality: 0.64 },
    ];
    let last: Blob | null = null;
    for (const pass of passes) {
      last = await paintJpeg(bitmap, pass.edge, pass.quality);
      if (last.size <= 1_400_000) return blobToDataUrl(last);
    }
    if (last && last.size <= 1_800_000) return blobToDataUrl(last);
    throw new Error("That image is too large. Crop it closer to the text.");
  } finally {
    bitmap.close();
  }
}

function paintJpeg(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(8, Math.round(bitmap.width * scale));
  const height = Math.max(8, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Couldn't prepare that image."));
  ctx.fillStyle = "#fffaf3";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't prepare that image."))),
      "image/jpeg",
      quality,
    );
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const stride = 0x8000;
  for (let i = 0; i < bytes.length; i += stride) {
    binary += String.fromCharCode(...bytes.subarray(i, i + stride));
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}
