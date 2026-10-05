import { i as __toESM, n as __exportAll } from "../_runtime.mjs";
import { K as require_react, _ as createFileRoute, b as require_jsx_runtime, d as Scripts, f as HeadContent, g as lazyRouteComponent, h as Outlet, m as createRouter, v as createRootRoute, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TriangleAlert } from "../_libs/lucide-react.mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-ViXbDSh3.js
var router_ViXbDSh3_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: errorMessage(error)
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var styles_default = "/assets/styles-C1ndqpkP.css";
var APP_NAME = "Folio";
var Route$3 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "Transcribe speech to text, or OCR the words off a photo."
			},
			{
				name: "theme-color",
				content: "#f3ecdf"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,650&family=Outfit:wght@400;500;600&display=swap"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	})
});
var $$splitComponentImporter = () => import("./routes-Div0aOt7.mjs");
var Route$2 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
function composeTranscript(input) {
	const words = (input.words ?? []).filter((word) => word.text.trim().length > 0);
	const speakerIds = /* @__PURE__ */ new Set();
	for (const word of words) if (typeof word.speaker === "number") speakerIds.add(word.speaker);
	if (speakerIds.size < 2 || words.length === 0) return {
		text: (input.text ?? "").trim(),
		speakers: speakerIds.size
	};
	const blocks = [];
	let current;
	let line = [];
	const flush = () => {
		if (line.length === 0) return;
		const label = current == null ? "Speaker" : `Speaker ${current + 1}`;
		blocks.push(`${label}\n${joinWords(line)}`);
		line = [];
	};
	for (const word of words) {
		if (word.speaker !== current) {
			flush();
			current = word.speaker;
		}
		line.push(word.text);
	}
	flush();
	return {
		text: blocks.join("\n\n"),
		speakers: speakerIds.size
	};
}
function joinWords(words) {
	return words.join(" ").replace(/ ([.,!?;:%)\]])/g, "$1").replace(/([(\[]) /g, "$1").replace(/\s+/g, " ").trim();
}
function cleanOcrText(raw) {
	let text = raw.trim();
	if (text.startsWith("```")) text = text.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
	return text;
}
function extractModelText(body) {
	if (!body || typeof body !== "object") return "";
	const record = body;
	if (typeof record.output_text === "string") return record.output_text;
	const chunks = [];
	const visit = (node) => {
		if (!node || typeof node !== "object") return;
		if (Array.isArray(node)) {
			for (const item of node) visit(item);
			return;
		}
		const obj = node;
		if (typeof obj.text === "string" && (obj.type === "output_text" || obj.type === "text")) chunks.push(obj.text);
		if (typeof obj.content === "string") chunks.push(obj.content);
		if (Array.isArray(obj.content)) visit(obj.content);
		if (Array.isArray(obj.output)) visit(obj.output);
	};
	visit(record.output);
	if (chunks.length > 0) return chunks.join("\n");
	const choices = record.choices;
	if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
		const message = choices[0].message;
		if (typeof message?.content === "string") return message.content;
		if (Array.isArray(message?.content)) {
			visit(message.content);
			if (chunks.length > 0) return chunks.join("\n");
		}
	}
	return "";
}
var MAX_BODY = 26e5;
var PROMPT = "You are an OCR engine. Transcribe every visible piece of text in this image, in natural reading order. Output only the transcription. Preserve paragraphs, headings, lists, and line breaks that carry meaning. Keep the original language and do not translate. Do not describe the picture, the layout, or the handwriting. Do not add a preamble. If a short span is unreadable, write [illegible]. If there is no text, output exactly: (no text found)";
var Route$1 = createFileRoute("/api/read-page")({ server: { handlers: { POST: async ({ request }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return Response.json({
		ok: false,
		error: "Page reading isn't available in this environment."
	}, { status: 503 });
	if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return Response.json({
		ok: false,
		error: "That image is too large. Try a closer crop."
	}, { status: 413 });
	let image = "";
	try {
		const body = await request.json();
		image = typeof body.image === "string" ? body.image : "";
	} catch {
		return Response.json({
			ok: false,
			error: "That image couldn't be read."
		}, { status: 400 });
	}
	if (!image.startsWith("data:image/jpeg;base64,")) return Response.json({
		ok: false,
		error: "Send a JPEG or PNG page."
	}, { status: 400 });
	if (image.length > MAX_BODY) return Response.json({
		ok: false,
		error: "That image is too large. Try a closer crop."
	}, { status: 413 });
	const first = await readWithModel(apiKey, image, "grok-4.5");
	const result = !first.ok && first.retry ? await readWithModel(apiKey, image, "grok-4.7") : first;
	if (!result.ok) return Response.json({
		ok: false,
		error: result.error
	}, { status: result.status });
	const text = cleanOcrText(result.text);
	if (!text) return Response.json({
		ok: false,
		error: "No text came back. Try a clearer, straighter photo."
	}, { status: 422 });
	return Response.json({
		ok: true,
		text
	});
} } } });
async function readWithModel(apiKey, image, model) {
	let upstream;
	try {
		upstream = await fetch("https://api.x.ai/v1/responses", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				model,
				store: false,
				max_output_tokens: 4e3,
				input: [{
					role: "user",
					content: [{
						type: "input_image",
						image_url: image,
						detail: "high"
					}, {
						type: "input_text",
						text: PROMPT
					}]
				}]
			}),
			signal: AbortSignal.timeout(6e4)
		});
	} catch {
		return {
			ok: false,
			status: 502,
			retry: false,
			error: "Page reading didn't respond. Try again."
		};
	}
	const payload = await upstream.json().catch(() => null);
	if (!upstream.ok) {
		const retry = upstream.status === 400 || upstream.status === 404;
		return {
			ok: false,
			status: upstream.status === 429 ? 429 : 502,
			retry,
			error: upstream.status === 429 ? "Page reading is busy. Wait a moment and try again." : "Couldn't read that page. Try a clearer photo."
		};
	}
	return {
		ok: true,
		text: extractModelText(payload)
	};
}
var MAX_BYTES = 4194304;
var Route = createFileRoute("/api/transcribe")({ server: { handlers: { POST: async ({ request }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return Response.json({
		ok: false,
		error: "Transcription isn't available in this environment."
	}, { status: 503 });
	let form;
	try {
		form = await request.formData();
	} catch {
		return Response.json({
			ok: false,
			error: "That upload couldn't be read."
		}, { status: 400 });
	}
	const file = form.get("file");
	if (!(file instanceof File)) return Response.json({
		ok: false,
		error: "Add an audio file first."
	}, { status: 400 });
	if (file.size > MAX_BYTES) return Response.json({
		ok: false,
		error: "That file is too large. Keep audio under 4 MB."
	}, { status: 413 });
	if (file.size < 64) return Response.json({
		ok: false,
		error: "That recording is too short to transcribe."
	}, { status: 400 });
	const language = stringField(form.get("language"));
	const diarize = stringField(form.get("diarize")) === "true";
	const keyterms = stringField(form.get("keyterms"));
	const outgoing = new FormData();
	outgoing.append("model", "grok-voice-transcribe-2.0");
	if (diarize) outgoing.append("diarize", "true");
	if (/^[a-z]{2}(-[a-z]{2})?$/i.test(language)) {
		outgoing.append("language", language.toLowerCase());
		outgoing.append("format", "true");
	}
	for (const term of keyterms.split(",").map((part) => part.trim()).filter(Boolean).slice(0, 12)) if (term.length <= 50) outgoing.append("keyterm", term);
	const bytes = await file.arrayBuffer();
	outgoing.append("file", new Blob([bytes], { type: file.type || "application/octet-stream" }), safeName(file.name, file.type));
	let upstream;
	try {
		upstream = await fetch("https://api.x.ai/v1/stt", {
			method: "POST",
			headers: { Authorization: `Bearer ${apiKey}` },
			body: outgoing,
			signal: AbortSignal.timeout(9e4)
		});
	} catch {
		return Response.json({
			ok: false,
			error: "The transcription service didn't respond. Try again."
		}, { status: 502 });
	}
	const payload = await upstream.json().catch(() => null);
	if (!upstream.ok) {
		const detail = errorDetail(payload);
		const formatProblem = upstream.status === 400 && /format|audio|codec|unsupported|container/i.test(detail);
		return Response.json({
			ok: false,
			code: formatProblem ? "format" : "upstream",
			error: formatProblem ? "That audio format wasn't accepted." : upstream.status === 429 ? "The transcription service is busy. Wait a moment and try again." : "Transcription failed. Try a shorter clip."
		}, { status: upstream.status });
	}
	const body = payload;
	const composed = composeTranscript({
		text: body.text,
		words: body.words
	});
	if (!composed.text) return Response.json({
		ok: false,
		error: "No speech detected. Move closer to the mic and try again."
	}, { status: 422 });
	return Response.json({
		ok: true,
		text: composed.text,
		language: typeof body.language === "string" ? body.language : "",
		duration: typeof body.duration === "number" ? body.duration : 0,
		speakers: composed.speakers
	});
} } } });
function stringField(value) {
	return typeof value === "string" ? value.trim() : "";
}
function safeName(name, type) {
	const cleaned = ((name || "audio").split(/[/\\]/).pop() || "audio").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
	if (cleaned.includes(".")) return cleaned;
	if (type.includes("wav")) return "audio.wav";
	if (type.includes("mpeg") || type.includes("mp3")) return "audio.mp3";
	if (type.includes("mp4") || type.includes("m4a")) return "audio.m4a";
	if (type.includes("ogg")) return "audio.ogg";
	if (type.includes("webm")) return "audio.webm";
	if (type.includes("flac")) return "audio.flac";
	return "audio.bin";
}
function errorDetail(payload) {
	if (!payload || typeof payload !== "object") return "";
	const record = payload;
	if (typeof record.message === "string") return record.message;
	if (typeof record.error === "string") return record.error;
	if (record.error && typeof record.error === "object") {
		const message = record.error.message;
		if (typeof message === "string") return message;
	}
	return "";
}
var rootRouteChildren = {
	IndexRoute: Route$2.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$3
	}),
	ApiReadPageRoute: Route$1.update({
		id: "/api/read-page",
		path: "/api/read-page",
		getParentRoute: () => Route$3
	}),
	ApiTranscribeRoute: Route.update({
		id: "/api/transcribe",
		path: "/api/transcribe",
		getParentRoute: () => Route$3
	})
};
var routeTree = Route$3._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { getRouter, router_ViXbDSh3_exports as t };
