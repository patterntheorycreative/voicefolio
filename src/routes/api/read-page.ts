import { createFileRoute } from "@tanstack/react-router";
import { cleanOcrText, extractModelText } from "@/lib/transcript";

const MAX_BODY = 2_600_000;
const PROMPT =
  "You are an OCR engine. Transcribe every visible piece of text in this image, in natural reading order. Output only the transcription. Preserve paragraphs, headings, lists, and line breaks that carry meaning. Keep the original language and do not translate. Do not describe the picture, the layout, or the handwriting. Do not add a preamble. If a short span is unreadable, write [illegible]. If there is no text, output exactly: (no text found)";

export const Route = createFileRoute("/api/read-page")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
          return Response.json(
            { ok: false, error: "Page reading isn't available in this environment." },
            { status: 503 },
          );
        }

        const length = Number(request.headers.get("content-length") || 0);
        if (length > MAX_BODY) {
          return Response.json(
            { ok: false, error: "That image is too large. Try a closer crop." },
            { status: 413 },
          );
        }

        let image = "";
        try {
          const body = (await request.json()) as { image?: unknown };
          image = typeof body.image === "string" ? body.image : "";
        } catch {
          return Response.json({ ok: false, error: "That image couldn't be read." }, { status: 400 });
        }

        if (!image.startsWith("data:image/jpeg;base64,")) {
          return Response.json(
            { ok: false, error: "Send a JPEG or PNG page." },
            { status: 400 },
          );
        }
        if (image.length > MAX_BODY) {
          return Response.json(
            { ok: false, error: "That image is too large. Try a closer crop." },
            { status: 413 },
          );
        }

        const first = await readWithModel(apiKey, image, "grok-4.5");
        const result =
          !first.ok && first.retry ? await readWithModel(apiKey, image, "grok-4.7") : first;

        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: result.status });
        }

        const text = cleanOcrText(result.text);
        if (!text) {
          return Response.json(
            { ok: false, error: "No text came back. Try a clearer, straighter photo." },
            { status: 422 },
          );
        }

        return Response.json({ ok: true, text });
      },
    },
  },
});

async function readWithModel(
  apiKey: string,
  image: string,
  model: string,
): Promise<
  | { ok: true; text: string }
  | { ok: false; error: string; status: number; retry: boolean }
> {
  let upstream: Response;
  try {
    upstream = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 4000,
        input: [
          {
            role: "user",
            content: [
              { type: "input_image", image_url: image, detail: "high" },
              { type: "input_text", text: PROMPT },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return {
      ok: false,
      status: 502,
      retry: false,
      error: "Page reading didn't respond. Try again.",
    };
  }

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const retry = upstream.status === 400 || upstream.status === 404;
    return {
      ok: false,
      status: upstream.status === 429 ? 429 : 502,
      retry,
      error:
        upstream.status === 429
          ? "Page reading is busy. Wait a moment and try again."
          : "Couldn't read that page. Try a clearer photo.",
    };
  }

  return { ok: true, text: extractModelText(payload) };
}
