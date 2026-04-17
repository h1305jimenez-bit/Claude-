import type { CandidateProfile } from "@/app/api/analyze-cv/route";

const PROFILE_KEY = "saved-profile-v1";
const CV_KEY = "saved-cv-b64-v1";

export function getSavedProfile(): CandidateProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as CandidateProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: CandidateProfile, cvFile?: File): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  // Store CV as base64 if small enough (< 4 MB unencoded)
  if (cvFile && cvFile.size < 4 * 1024 * 1024) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(CV_KEY, reader.result as string);
      } catch {
        // localStorage quota exceeded — skip silently
      }
    };
    reader.readAsDataURL(cvFile);
  }
}

export function getSavedCvDataUrl(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CV_KEY);
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "application/pdf";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

export function clearSavedProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(CV_KEY);
}
