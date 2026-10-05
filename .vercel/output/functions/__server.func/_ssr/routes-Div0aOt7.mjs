import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Mic, c as Copy, i as Square, l as Check, o as ImagePlus, r as Trash2, s as Download, t as Upload, u as AudioLines } from "../_libs/lucide-react.mjs";
import { t as formatDistanceToNow } from "../_libs/date-fns.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Div0aOt7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KEY = "folio.clips.v1";
var LIMIT = 16;
function loadClips() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isClip).slice(0, LIMIT);
	} catch {
		return [];
	}
}
function saveClips(clips) {
	localStorage.setItem(KEY, JSON.stringify(clips.slice(0, LIMIT)));
}
function titleFrom(text, kind) {
	const clean = (text.split("\n").map((part) => part.trim()).find((part) => part.length > 0 && !/^speaker \d+$/i.test(part)) ?? "").replace(/\s+/g, " ").slice(0, 72);
	if (clean) return clean;
	return kind === "audio" ? "Untitled recording" : "Untitled page";
}
function isClip(value) {
	if (!value || typeof value !== "object") return false;
	const clip = value;
	return typeof clip.id === "string" && (clip.kind === "audio" || clip.kind === "page") && typeof clip.title === "string" && typeof clip.text === "string" && typeof clip.createdAt === "number";
}
var TARGET_RATE = 16e3;
async function blobToWav(blob) {
	const ctx = new AudioContext();
	try {
		const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
		return encodeWav(downsample(mix(decoded), decoded.sampleRate, TARGET_RATE), TARGET_RATE);
	} finally {
		await ctx.close();
	}
}
function mix(buffer) {
	const length = buffer.length;
	const mixed = new Float32Array(length);
	const channels = buffer.numberOfChannels;
	for (let channel = 0; channel < channels; channel += 1) {
		const data = buffer.getChannelData(channel);
		for (let i = 0; i < length; i += 1) mixed[i] += data[i] / channels;
	}
	return mixed;
}
function downsample(input, fromRate, toRate) {
	if (fromRate === toRate) return input;
	const ratio = fromRate / toRate;
	const length = Math.max(1, Math.round(input.length / ratio));
	const output = new Float32Array(length);
	for (let i = 0; i < length; i += 1) {
		const start = Math.floor(i * ratio);
		const end = Math.min(input.length, Math.floor((i + 1) * ratio));
		let sum = 0;
		let count = 0;
		for (let j = start; j < end; j += 1) {
			sum += input[j];
			count += 1;
		}
		output[i] = count ? sum / count : input[Math.min(start, input.length - 1)] ?? 0;
	}
	return output;
}
function encodeWav(samples, rate) {
	const dataSize = samples.length * 2;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);
	write(view, 0, "RIFF");
	view.setUint32(4, 36 + dataSize, true);
	write(view, 8, "WAVE");
	write(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, rate, true);
	view.setUint32(28, rate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	write(view, 36, "data");
	view.setUint32(40, dataSize, true);
	let offset = 44;
	for (let i = 0; i < samples.length; i += 1) {
		const sample = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
		offset += 2;
	}
	return new Blob([buffer], { type: "audio/wav" });
}
function write(view, offset, text) {
	for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}
var MAX_AUDIO = 3774873.6;
var MAX_RECORD_SECONDS = 480;
var LANGUAGES = [
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
	["zh", "Chinese"]
];
var LANGUAGE_NAMES = Object.fromEntries(LANGUAGES.filter(([code]) => code !== "auto"));
function FolioDesk() {
	const [mode, setMode] = (0, import_react.useState)("voice");
	const [phase, setPhase] = (0, import_react.useState)("idle");
	const [status, setStatus] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [draft, setDraft] = (0, import_react.useState)("");
	const [clips, setClips] = (0, import_react.useState)([]);
	const [activeId, setActiveId] = (0, import_react.useState)(null);
	const [meta, setMeta] = (0, import_react.useState)({});
	const [language, setLanguage] = (0, import_react.useState)("auto");
	const [diarize, setDiarize] = (0, import_react.useState)(true);
	const [keyterms, setKeyterms] = (0, import_react.useState)("");
	const [elapsed, setElapsed] = (0, import_react.useState)(0);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [dragOver, setDragOver] = (0, import_react.useState)(false);
	const [voiceFile, setVoiceFile] = (0, import_react.useState)(null);
	const [imageFile, setImageFile] = (0, import_react.useState)(null);
	const [imageUrl, setImageUrl] = (0, import_react.useState)(null);
	const optsRef = (0, import_react.useRef)({
		language,
		diarize,
		keyterms
	});
	optsRef.current = {
		language,
		diarize,
		keyterms
	};
	const audioInputRef = (0, import_react.useRef)(null);
	const imageInputRef = (0, import_react.useRef)(null);
	const canvasRef = (0, import_react.useRef)(null);
	const analyserRef = (0, import_react.useRef)(null);
	const recorderRef = (0, import_react.useRef)(null);
	const chunksRef = (0, import_react.useRef)([]);
	const streamRef = (0, import_react.useRef)(null);
	const audioCtxRef = (0, import_react.useRef)(null);
	const stopRef = (0, import_react.useRef)(() => {});
	const sendRef = (0, import_react.useRef)(() => {});
	(0, import_react.useEffect)(() => {
		setClips(loadClips());
	}, []);
	(0, import_react.useEffect)(() => {
		if (!activeId) return;
		const handle = window.setTimeout(() => {
			setClips((current) => {
				const next = current.map((clip) => clip.id === activeId ? {
					...clip,
					text: draft,
					title: titleFrom(draft, clip.kind)
				} : clip);
				saveClips(next);
				return next;
			});
		}, 400);
		return () => window.clearTimeout(handle);
	}, [draft, activeId]);
	(0, import_react.useEffect)(() => {
		if (phase !== "recording") return;
		const started = Date.now();
		const id = window.setInterval(() => {
			const seconds = (Date.now() - started) / 1e3;
			setElapsed(seconds);
			if (seconds >= MAX_RECORD_SECONDS) stopRef.current();
		}, 200);
		return () => window.clearInterval(id);
	}, [phase]);
	(0, import_react.useEffect)(() => {
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
			const barWidth = (width - 93) / bars;
			ctx.fillStyle = getComputedStyle(canvas).color;
			for (let i = 0; i < bars; i += 1) {
				const value = bins[Math.floor(i / bars * bins.length)] / 255;
				const barHeight = Math.max(3, value * height);
				const x = i * (barWidth + gap);
				ctx.fillRect(x, (height - barHeight) / 2, Math.max(1, barWidth), barHeight);
			}
		};
		draw();
		return () => cancelAnimationFrame(frame);
	}, [phase]);
	(0, import_react.useEffect)(() => {
		return () => {
			streamRef.current?.getTracks().forEach((track) => track.stop());
			audioCtxRef.current?.close();
			if (imageUrl) URL.revokeObjectURL(imageUrl);
		};
	}, []);
	function remember(kind, text, extra) {
		const clip = {
			id: crypto.randomUUID(),
			kind,
			title: titleFrom(text, kind),
			text,
			createdAt: Date.now(),
			...extra
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
	async function sendAudio(file, triedWav = false) {
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
		let response;
		try {
			response = await fetch("/api/transcribe", {
				method: "POST",
				body
			});
		} catch {
			setPhase("error");
			setStatus("");
			setError("Couldn't reach transcription. Check your connection and try again.");
			return;
		}
		const data = await response.json().catch(() => null);
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
			speakers: data.speakers
		});
		setStatus("");
		setVoiceFile(null);
		remember("audio", data.text, {
			duration: data.duration,
			language: data.language,
			speakers: data.speakers
		});
	}
	sendRef.current = (file) => {
		sendAudio(file);
	};
	async function startRecording() {
		setError("");
		setVoiceFile(null);
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: {
				echoCancellation: true,
				noiseSuppression: true
			} });
			streamRef.current = stream;
			const ctx = new AudioContext();
			audioCtxRef.current = ctx;
			const source = ctx.createMediaStreamSource(stream);
			const analyser = ctx.createAnalyser();
			analyser.fftSize = 256;
			source.connect(analyser);
			analyserRef.current = analyser;
			const mime = [
				"audio/mp4",
				"audio/webm;codecs=opus",
				"audio/webm",
				"audio/ogg;codecs=opus"
			].find((type) => MediaRecorder.isTypeSupported(type));
			const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : void 0);
			chunksRef.current = [];
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) chunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				stream.getTracks().forEach((track) => track.stop());
				ctx.close();
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
			audioCtxRef.current?.close();
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
		else if (phase !== "working") startRecording();
	}
	function takeAudioFile(file) {
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
	function takeImageFile(file) {
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
				body: JSON.stringify({ image })
			});
			const data = await response.json().catch(() => null);
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
	function openClip(clip) {
		setActiveId(clip.id);
		setDraft(clip.text);
		setMode(clip.kind === "audio" ? "voice" : "page");
		setMeta({
			language: clip.language,
			duration: clip.duration,
			speakers: clip.speakers
		});
		setPhase("ready");
		setError("");
		setStatus("");
	}
	function removeClip(id) {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 sm:py-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-6 h-1 w-16 bg-ember",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "max-w-2xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium tracking-widest text-ember uppercase",
						children: "Desk"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 font-serif text-4xl tracking-tight text-balance sm:text-5xl",
						children: "Folio"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-xl text-pretty text-muted",
						children: "Turn speech into text, or pull the words off a photo with OCR."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				role: "tablist",
				"aria-label": "What to read",
				className: "mt-8 inline-flex rounded-full border border-line bg-sheet p-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tab, {
					selected: mode === "voice",
					onClick: () => setMode("voice"),
					children: "Voice"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tab, {
					selected: mode === "page",
					onClick: () => setMode("page"),
					children: "Page OCR"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-xl text-sm text-pretty text-muted",
				children: mode === "voice" ? "Record, or drop an MP3, M4A, WAV, or OGG under 4 MB. Speech becomes a transcript you can edit." : "Photograph a page, slide, receipt, whiteboard, or screenshot. OCR copies the letters it can see."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid items-start gap-6 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					className: "rounded-2xl border border-line bg-sheet p-5 sm:p-6",
					children: mode === "voice" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-widest text-muted uppercase",
							children: "Take"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-col items-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: onRecordClick,
									disabled: busy,
									"aria-pressed": phase === "recording",
									className: `grid size-24 place-items-center rounded-full bg-ember text-sheet transition-colors duration-200 hover:bg-ink disabled:opacity-40 ${phase === "recording" ? "folio-pulse" : ""}`,
									children: [phase === "recording" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {
										className: "size-7",
										fill: "currentColor",
										"aria-hidden": "true"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, {
										className: "size-8",
										"aria-hidden": "true"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "sr-only",
										children: phase === "recording" ? "Stop recording" : "Start recording"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 font-medium tabular-nums",
									children: phase === "recording" ? clock(elapsed) : phase === "working" ? "Working" : "Record"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: phase === "recording" ? "Tap again to stop and transcribe" : "Tap to capture speech"
								})
							]
						}),
						phase === "recording" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
							ref: canvasRef,
							className: "mt-5 h-16 w-full text-ember",
							"aria-hidden": "true"
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onDragOver: (event) => {
								event.preventDefault();
								setDragOver(true);
							},
							onDragLeave: () => setDragOver(false),
							onDrop: (event) => {
								event.preventDefault();
								setDragOver(false);
								const file = event.dataTransfer.files?.[0];
								if (file?.type.startsWith("image/")) {
									setMode("page");
									takeImageFile(file);
								} else takeAudioFile(file);
							},
							className: `mt-6 rounded-2xl border border-dashed px-4 py-5 text-center ${dragOver ? "border-ember" : "border-line"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {
									className: "mx-auto size-5 text-muted",
									"aria-hidden": "true"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-sm",
									children: "Drop an audio file"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => audioInputRef.current?.click(),
									disabled: busy || phase === "recording",
									className: "mt-3 inline-flex h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-medium hover:border-ink disabled:opacity-40",
									children: "Choose a file"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: audioInputRef,
									type: "file",
									accept: "audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.ogg,.flac,.aac,.opus,.webm,.mp4,.mkv",
									className: "sr-only",
									onChange: (event) => {
										takeAudioFile(event.target.files?.[0]);
										event.target.value = "";
									}
								}),
								voiceFile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-3 truncate text-sm text-muted",
									children: [
										voiceFile.name,
										" · ",
										formatBytes(voiceFile.size)
									]
								}) : null
							]
						}),
						voiceFile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void sendAudio(voiceFile),
							disabled: busy,
							className: "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ember text-sm font-medium text-sheet hover:bg-ink disabled:opacity-40",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AudioLines, {
								className: "size-4",
								"aria-hidden": "true"
							}), "Transcribe"]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
							className: "mt-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
								className: "text-sm text-muted",
								children: "Language, speakers, names"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 grid gap-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "grid gap-2 text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium",
											children: "Language"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											value: language,
											onChange: (event) => setLanguage(event.target.value),
											className: "h-11 rounded-full border border-line bg-sheet px-4",
											children: LANGUAGES.map(([code, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: code,
												children: label
											}, code))
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center justify-between gap-3 text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block font-medium",
											children: "Label speakers"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted",
											children: "When more than one person talks"
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: diarize,
											onChange: (event) => setDiarize(event.target.checked),
											className: "size-5 accent-ember"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "grid gap-2 text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium",
											children: "Names to catch"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: keyterms,
											onChange: (event) => setKeyterms(event.target.value),
											placeholder: "Acme, Dr. Okonkwo",
											className: "h-11 rounded-full border border-line bg-sheet px-4 placeholder:text-muted"
										})]
									})
								]
							})]
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-widest text-muted uppercase",
							children: "Page"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							onDragOver: (event) => {
								event.preventDefault();
								setDragOver(true);
							},
							onDragLeave: () => setDragOver(false),
							onDrop: (event) => {
								event.preventDefault();
								setDragOver(false);
								const file = event.dataTransfer.files?.[0];
								if (file && !file.type.startsWith("image/")) {
									setMode("voice");
									takeAudioFile(file);
								} else takeImageFile(file);
							},
							className: `mt-5 overflow-hidden rounded-2xl border border-dashed ${dragOver ? "border-ember" : "border-line"}`,
							children: imageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: imageUrl,
								alt: "Page to read",
								className: "max-h-72 w-full object-contain"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "px-4 py-10 text-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, {
									className: "mx-auto size-6 text-muted",
									"aria-hidden": "true"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm",
									children: "Drop a photo of text"
								})]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex flex-wrap gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => imageInputRef.current?.click(),
								disabled: busy,
								className: "inline-flex h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-medium hover:border-ink disabled:opacity-40",
								children: "Choose a photo"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									const input = imageInputRef.current;
									if (!input) return;
									input.setAttribute("capture", "environment");
									input.click();
									input.removeAttribute("capture");
								},
								disabled: busy,
								className: "inline-flex h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-medium hover:border-ink disabled:opacity-40",
								children: "Use camera"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: imageInputRef,
							type: "file",
							accept: "image/*",
							className: "sr-only",
							onChange: (event) => {
								takeImageFile(event.target.files?.[0]);
								event.target.value = "";
							}
						}),
						imageFile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 truncate text-sm text-muted",
							children: imageFile.name
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void readPage(),
							disabled: busy || !imageFile,
							className: "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ember text-sm font-medium text-sheet hover:bg-ink disabled:opacity-40",
							children: "Read the page"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-2xl border border-line bg-sheet p-5 sm:p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-medium tracking-widest text-muted uppercase",
									children: "Manuscript"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 truncate text-sm text-muted",
									children: metaLine
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex shrink-0 gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									label: copied ? "Copied" : "Copy transcript",
									onClick: () => void copyDraft(),
									disabled: !draft,
									children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									label: "Download text file",
									onClick: downloadDraft,
									disabled: !draft,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" })
								})]
							})]
						}),
						busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "folio-bar mt-4",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-4 h-0.5" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "sr-only",
							"aria-live": "polite",
							children: status || error
						}),
						status ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted",
							children: status
						}) : null,
						error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-ember",
							children: error
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: draft,
							onChange: (event) => {
								setDraft(event.target.value);
								if (phase !== "working" && phase !== "recording") setPhase(event.target.value ? "ready" : "idle");
							},
							placeholder: "The words land here. Edit anything that came out wrong.",
							spellCheck: true,
							className: "mt-3 min-h-72 w-full resize-y bg-transparent font-serif text-lg leading-relaxed text-ink outline-none placeholder:text-muted"
						}),
						draft ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: clearSheet,
							className: "mt-2 text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink",
							children: "Clear sheet"
						}) : null
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-2xl tracking-tight",
						children: "Earlier"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Kept on this device only."
					}),
					clips.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted",
						children: "Nothing set yet. A transcript you make will wait here."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 divide-y divide-line rounded-2xl border border-line bg-sheet",
						children: clips.map((clip) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-3 px-3 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => openClip(clip),
								className: "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-paper",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "w-14 shrink-0 text-xs font-medium tracking-wide text-muted uppercase",
									children: clip.kind === "audio" ? "Voice" : "Page"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate font-medium",
										children: clip.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-sm text-muted",
										children: formatDistanceToNow(clip.createdAt, { addSuffix: true })
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => removeClip(clip.id),
								"aria-label": `Delete ${clip.title}`,
								className: "grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-ember",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
							})]
						}, clip.id))
					})
				]
			})
		]
	});
}
function Tab({ selected, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		role: "tab",
		"aria-selected": selected,
		onClick,
		className: `h-11 rounded-full px-5 text-sm font-medium ${selected ? "bg-ink text-sheet" : "text-muted hover:text-ink"}`,
		children
	});
}
function IconButton({ label, onClick, disabled, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		title: label,
		onClick,
		disabled,
		className: "grid size-11 place-items-center rounded-full border border-line text-ink hover:border-ink disabled:opacity-40",
		children
	});
}
function clock(seconds) {
	const total = Math.floor(seconds);
	return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
function formatBytes(size) {
	if (size < 1024) return `${size} B`;
	if (size < 1048576) return `${Math.round(size / 1024)} KB`;
	return `${(size / 1048576).toFixed(1)} MB`;
}
function slug(value) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "folio";
}
function describeMeta(meta, words) {
	const parts = [];
	if (meta.duration && meta.duration > 0) parts.push(clock(meta.duration));
	if (meta.language) {
		const code = meta.language.toLowerCase().split("-")[0];
		parts.push(LANGUAGE_NAMES[code] ?? meta.language);
	}
	if (meta.speakers && meta.speakers > 1) parts.push(`${meta.speakers} speakers`);
	if (words > 0) parts.push(`${words} ${words === 1 ? "word" : "words"}`);
	return parts.join(" · ") || "Waiting for words";
}
async function fileToJpegDataUrl(file) {
	let bitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		throw new Error("Couldn't open that image. Use a JPEG or PNG.");
	}
	try {
		const passes = [
			{
				edge: 1600,
				quality: .86
			},
			{
				edge: 1280,
				quality: .72
			},
			{
				edge: 1024,
				quality: .64
			}
		];
		let last = null;
		for (const pass of passes) {
			last = await paintJpeg(bitmap, pass.edge, pass.quality);
			if (last.size <= 14e5) return blobToDataUrl(last);
		}
		if (last && last.size <= 18e5) return blobToDataUrl(last);
		throw new Error("That image is too large. Crop it closer to the text.");
	} finally {
		bitmap.close();
	}
}
function paintJpeg(bitmap, maxEdge, quality) {
	const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(8, Math.round(bitmap.width * scale));
	const height = Math.max(8, Math.round(bitmap.height * scale));
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return Promise.reject(/* @__PURE__ */ new Error("Couldn't prepare that image."));
	ctx.fillStyle = "#fffaf3";
	ctx.fillRect(0, 0, width, height);
	ctx.drawImage(bitmap, 0, 0, width, height);
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => blob ? resolve(blob) : reject(/* @__PURE__ */ new Error("Couldn't prepare that image.")), "image/jpeg", quality);
	});
}
async function blobToDataUrl(blob) {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	let binary = "";
	const stride = 32768;
	for (let i = 0; i < bytes.length; i += stride) binary += String.fromCharCode(...bytes.subarray(i, i + stride));
	return `data:image/jpeg;base64,${btoa(binary)}`;
}
var SplitComponent = FolioDesk;
//#endregion
export { SplitComponent as component };
