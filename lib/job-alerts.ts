const KEY = "job-alerts-v1";

export interface JobAlert {
  id: string;
  query: string;
  email: string;
  createdAt: string;
  lastChecked: string | null;
  seenJobIds: string[];
}

export function getAlerts(): JobAlert[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as JobAlert[];
  } catch {
    return [];
  }
}

export function saveAlert(query: string, email: string): JobAlert {
  const list = getAlerts();
  const alert: JobAlert = {
    id: crypto.randomUUID(),
    query,
    email,
    createdAt: new Date().toISOString(),
    lastChecked: null,
    seenJobIds: [],
  };
  localStorage.setItem(KEY, JSON.stringify([alert, ...list]));
  return alert;
}

export function updateAlertSeen(
  id: string,
  seenJobIds: string[],
): void {
  const list = getAlerts().map((a) =>
    a.id === id
      ? { ...a, seenJobIds, lastChecked: new Date().toISOString() }
      : a,
  );
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function deleteAlert(id: string): void {
  const list = getAlerts().filter((a) => a.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}
