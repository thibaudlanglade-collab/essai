// Google Analytics 4 — chargé uniquement après consentement explicite (CNIL).
// Le Measurement ID est public (visible dans le bundle JS), donc pas besoin de le cacher.

const CONSENT_KEY = "synthese-ga-consent";
const MEASUREMENT_ID = "G-S1BLEWTLFD";

type ConsentValue = "granted" | "denied";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let scriptLoaded = false;

export function getConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // ignore
  }
  if (value === "granted") {
    loadGA();
  }
}

function loadGA() {
  if (scriptLoaded || !MEASUREMENT_ID) return;
  scriptLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: false,
  });

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

export function initAnalytics() {
  if (getConsent() === "granted") loadGA();
}

export function trackPageView(path: string, title?: string) {
  if (!MEASUREMENT_ID || getConsent() !== "granted" || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

export function resetConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // ignore
  }
}
