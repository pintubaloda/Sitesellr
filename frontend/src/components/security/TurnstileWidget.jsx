import { useEffect, useRef, useState } from "react";

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

const loadTurnstile = () =>
  new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }

    const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.turnstile), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = reject;
    document.head.appendChild(script);
  });

export const TurnstileWidget = ({ siteKey, onTokenChange, resetSignal = 0 }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!siteKey) return;
    let isCancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (isCancelled || !turnstile || !containerRef.current) return;
        if (widgetIdRef.current !== null) {
          turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => onTokenChange(token || ""),
          "expired-callback": () => onTokenChange(""),
          "error-callback": () => onTokenChange(""),
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setLoadError("Captcha failed to load. Please refresh and try again.");
        }
      });

    return () => {
      isCancelled = true;
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onTokenChange, resetSignal]);

  if (!siteKey) {
    return (
      <p className="text-sm text-amber-600 dark:text-amber-400">
        Turnstile site key missing. Set <code>REACT_APP_TURNSTILE_SITE_KEY</code>.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} />
      {loadError ? <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p> : null}
    </div>
  );
};

export default TurnstileWidget;
