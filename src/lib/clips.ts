export type ClipKind = "audio" | "page";

export type Clip = {
  id: string;
  kind: ClipKind;
  title: string;
  text: string;
  createdAt: number;
  duration?: number;
  language?: string;
  speakers?: number;
};

const KEY = "folio.clips.v1";
const LIMIT = 16;

export function loadClips(): Clip[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isClip).slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function saveClips(clips: Clip[]) {
  localStorage.setItem(KEY, JSON.stringify(clips.slice(0, LIMIT)));
}

export function titleFrom(text: string, kind: ClipKind): string {
  const line =
    text
      .split("\n")
      .map((part) => part.trim())
      .find((part) => part.length > 0 && !/^speaker \d+$/i.test(part)) ?? "";
  const clean = line.replace(/\s+/g, " ").slice(0, 72);
  if (clean) return clean;
  return kind === "audio" ? "Untitled recording" : "Untitled page";
}

function isClip(value: unknown): value is Clip {
  if (!value || typeof value !== "object") return false;
  const clip = value as Clip;
  return (
    typeof clip.id === "string" &&
    (clip.kind === "audio" || clip.kind === "page") &&
    typeof clip.title === "string" &&
    typeof clip.text === "string" &&
    typeof clip.createdAt === "number"
  );
}
