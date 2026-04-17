export type AppStatus = "applied" | "interview" | "rejected" | "offer";

export interface Application {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  url: string;
  source: string;
  method: "auto" | "manual";
  ats?: string;
  status: AppStatus;
  appliedAt: string;
  coverLetter?: string;
}

const KEY = "job-applications-v1";

export function getApplications(): Application[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Application[];
  } catch {
    return [];
  }
}

export function saveApplication(
  data: Omit<Application, "id" | "appliedAt">,
): Application {
  const list = getApplications();
  const app: Application = {
    ...data,
    id: crypto.randomUUID(),
    appliedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify([app, ...list]));
  return app;
}

export function updateStatus(id: string, status: AppStatus): void {
  const list = getApplications().map((a) =>
    a.id === id ? { ...a, status } : a,
  );
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function deleteApplication(id: string): void {
  const list = getApplications().filter((a) => a.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function isApplied(url: string): boolean {
  return getApplications().some((a) => a.url === url);
}
