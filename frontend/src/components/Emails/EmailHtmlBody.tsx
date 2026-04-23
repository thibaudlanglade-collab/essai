/**
 * Sandboxed iframe renderer for Gmail HTML bodies.
 *
 * Why an iframe: marketing emails ship their own CSS (table widths, inline
 * styles, @media rules). Rendering them straight into the React DOM leaks
 * styles both ways and blows out the layout. A sandboxed iframe gives the
 * email its own document, so its CSS stays contained and our layout stays
 * responsive.
 *
 * The iframe auto-resizes to the height of its content on load (and on
 * resize via ResizeObserver), mimicking Gmail's native behaviour.
 */
import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  html: string;
}

function stripScripts(raw: string): string {
  return raw.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );
}

function wrapDocument(html: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank" rel="noopener noreferrer">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
    color: #1f2937;
    font-size: 14px;
    line-height: 1.55;
    padding: 16px 20px;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  img, video, iframe { max-width: 100% !important; height: auto !important; }
  table { max-width: 100% !important; }
  table[width] { width: 100% !important; }
  a { color: #2563eb; word-break: break-word; overflow-wrap: anywhere; }
  pre, code { white-space: pre-wrap; word-break: break-word; }
  /* Hide tracking pixels that force weird widths */
  img[width="1"], img[height="1"] { display: none !important; }
</style>
</head>
<body>${stripScripts(html)}</body>
</html>`;
}

export default function EmailHtmlBody({ html }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);
  const srcDoc = useMemo(() => wrapDocument(html), [html]);

  // When the iframe finishes loading (or its content resizes), sync the
  // outer iframe height to the inner body scrollHeight.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let observer: ResizeObserver | null = null;

    function resize() {
      const doc = iframe?.contentDocument;
      const body = doc?.body;
      if (body) {
        const h = Math.max(body.scrollHeight, doc?.documentElement?.scrollHeight || 0);
        setHeight(h + 16);
      }
    }

    function onLoad() {
      resize();
      const doc = iframe?.contentDocument;
      if (doc?.body && "ResizeObserver" in window) {
        observer = new ResizeObserver(resize);
        observer.observe(doc.body);
      }
    }

    iframe.addEventListener("load", onLoad);
    return () => {
      iframe.removeEventListener("load", onLoad);
      observer?.disconnect();
    };
  }, [srcDoc]);

  return (
    <iframe
      ref={iframeRef}
      title="Email"
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="w-full border-0 block bg-white"
      style={{ height: `${height}px` }}
    />
  );
}
