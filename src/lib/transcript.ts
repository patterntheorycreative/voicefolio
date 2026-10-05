export type TranscriptWord = {
  text: string;
  start?: number;
  end?: number;
  speaker?: number;
};

export function composeTranscript(input: {
  text?: string;
  words?: TranscriptWord[];
}): { text: string; speakers: number } {
  const words = (input.words ?? []).filter((word) => word.text.trim().length > 0);
  const speakerIds = new Set<number>();
  for (const word of words) {
    if (typeof word.speaker === "number") speakerIds.add(word.speaker);
  }

  if (speakerIds.size < 2 || words.length === 0) {
    return { text: (input.text ?? "").trim(), speakers: speakerIds.size };
  }

  const blocks: string[] = [];
  let current: number | undefined;
  let line: string[] = [];

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

  return { text: blocks.join("\n\n"), speakers: speakerIds.size };
}

function joinWords(words: string[]): string {
  return words
    .join(" ")
    .replace(/ ([.,!?;:%)\]])/g, "$1")
    .replace(/([(\[]) /g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanOcrText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  }
  return text;
}

export function extractModelText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;

  const chunks: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (typeof obj.text === "string" && (obj.type === "output_text" || obj.type === "text")) {
      chunks.push(obj.text);
    }
    if (typeof obj.content === "string") chunks.push(obj.content);
    if (Array.isArray(obj.content)) visit(obj.content);
    if (Array.isArray(obj.output)) visit(obj.output);
  };

  visit(record.output);
  if (chunks.length > 0) return chunks.join("\n");

  const choices = record.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const message = (choices[0] as { message?: { content?: unknown } }).message;
    if (typeof message?.content === "string") return message.content;
    if (Array.isArray(message?.content)) {
      visit(message.content);
      if (chunks.length > 0) return chunks.join("\n");
    }
  }
  return "";
}
