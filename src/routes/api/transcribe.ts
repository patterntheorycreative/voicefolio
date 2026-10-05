import { createFileRoute } from "@tanstack/react-router";
import { composeTranscript, type TranscriptWord } from "@/lib/transcript";

const MAX_BYTES = 4 * 1024 * 1024;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
          return Response.json(
            { ok: false, error: "Transcription isn't available in this environment." },
            { status: 503 },
          );
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json(
            { ok: false, error: "That upload couldn't be read." },
            { status: 400 },
          );
        }

        const file = form.get("file");
        if (!(file instanceof File)) {
          return Response.json({ ok: false, error: "Add an audio file first." }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
          return Response.json(
            { ok: false, error: "That file is too large. Keep audio under 4 MB." },
            { status: 413 },
          );
        }
        if (file.size < 64) {
          return Response.json(
            { ok: false, error: "That recording is too short to transcribe." },
            { status: 400 },
          );
        }

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
        for (const term of keyterms
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 12)) {
          if (term.length <= 50) outgoing.append("keyterm", term);
        }

        const bytes = await file.arrayBuffer();
        outgoing.append("file", new Blob([bytes], { type: file.type || "application/octet-stream" }), safeName(file.name, file.type));

        let upstream: Response;
        try {
          upstream = await fetch("https://api.x.ai/v1/stt", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: outgoing,
            signal: AbortSignal.timeout(90_000),
          });
        } catch {
          return Response.json(
            { ok: false, error: "The transcription service didn't respond. Try again." },
            { status: 502 },
          );
        }

        const payload = await upstream.json().catch(() => null);
        if (!upstream.ok) {
          const detail = errorDetail(payload);
          const formatProblem = upstream.status === 400 && /format|audio|codec|unsupported|container/i.test(detail);
          return Response.json(
            {
              ok: false,
              code: formatProblem ? "format" : "upstream",
              error: formatProblem
                ? "That audio format wasn't accepted."
                : upstream.status === 429
                  ? "The transcription service is busy. Wait a moment and try again."
                  : "Transcription failed. Try a shorter clip.",
            },
            { status: upstream.status },
          );
        }

        const body = payload as { text?: string; language?: string; duration?: number; words?: TranscriptWord[] };
        const composed = composeTranscript({ text: body.text, words: body.words });
        if (!composed.text) {
          return Response.json(
            { ok: false, error: "No speech detected. Move closer to the mic and try again." },
            { status: 422 },
          );
        }

        return Response.json({
          ok: true,
          text: composed.text,
          language: typeof body.language === "string" ? body.language : "",
          duration: typeof body.duration === "number" ? body.duration : 0,
          speakers: composed.speakers,
        });
      },
    },
  },
});

function stringField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeName(name: string, type: string): string {
  const base = (name || "audio").split(/[/\\]/).pop() || "audio";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
  if (cleaned.includes(".")) return cleaned;
  if (type.includes("wav")) return "audio.wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "audio.mp3";
  if (type.includes("mp4") || type.includes("m4a")) return "audio.m4a";
  if (type.includes("ogg")) return "audio.ogg";
  if (type.includes("webm")) return "audio.webm";
  if (type.includes("flac")) return "audio.flac";
  return "audio.bin";
}

function errorDetail(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as { error?: unknown; message?: unknown };
  if (typeof record.message === "string") return record.message;
  if (typeof record.error === "string") return record.error;
  if (record.error && typeof record.error === "object") {
    const message = (record.error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}
