"use client";

/**
 * Universal intake.
 *
 * The home screen owns one drop target for every file type. It parks the file
 * here, opens the right instrument, and the instrument claims the file on
 * mount. No prop drilling, no duplicate upload logic at the entry point.
 */

export type IntakeTarget = "upi" | "qr" | "job" | "deepfake" | "document";

const pending = new Map<IntakeTarget, File>();

export function queueIntake(target: IntakeTarget, file: File) {
  pending.set(target, file);
}

export function takeIntake(target: IntakeTarget): File | null {
  const file = pending.get(target) ?? null;
  if (file) pending.delete(target);
  return file;
}

export function hasIntake(target: IntakeTarget) {
  return pending.has(target);
}

/** Best-effort routing from a file's MIME type / extension. */
export function guessTarget(file: File): IntakeTarget | null {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v)$/.test(name)) return "deepfake";
  if (type === "application/pdf" || /\.pdf$/.test(name)) return "document";
  if (type.startsWith("text/") || /\.(txt|text|md|rtf|doc|docx)$/.test(name)) return "job";
  if (type.startsWith("image/")) return "upi";
  return null;
}

export function describeFile(file: File): string {
  const kb = file.size / 1024;
  const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
  return `${file.name} · ${size}`;
}
