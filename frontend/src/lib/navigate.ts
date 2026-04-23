// Minimal navigate helper for the app's state-based routing.
// Dispatches a CustomEvent that App.tsx listens for and maps to activeMode.
// Mimics react-router's useNavigate signature so call sites stay familiar.

export type AppPath =
  | "/"
  | "/contact"
  | "/comprendre"
  | "/rgpd"
  | "/features"
  | "/qui-sommes-nous"
  | "/tarification"
  | "/demo"
  | "/home";

export const NAVIGATE_EVENT = "app-navigate";

export function pathToMode(path: string): string {
  const clean = path.replace(/^\//, "");
  if (clean === "" || clean === "home") return "home";
  return clean;
}

export function useNavigate() {
  return (path: string) => {
    window.dispatchEvent(
      new CustomEvent(NAVIGATE_EVENT, { detail: pathToMode(path) })
    );
  };
}
