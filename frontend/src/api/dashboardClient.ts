const API = "http://localhost:8000/api/dashboard";

export type RadarSeverity = "critical" | "warning" | "info";

export type RadarSignal = {
  key: string;
  severity: RadarSeverity;
  title: string;
  detail: string;
  count: number;
  to: string;
  icon: string;
};

export type RadarResponse = {
  signals: RadarSignal[];
  generated_at: string;
};

export async function fetchRadar(): Promise<RadarResponse> {
  const res = await fetch(`${API}/radar`, { credentials: "include" });
  if (!res.ok) throw new Error(`Radar failed: ${res.statusText}`);
  return res.json();
}
