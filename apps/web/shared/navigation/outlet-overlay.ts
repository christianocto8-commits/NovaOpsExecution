const OVERLAY_EVENT = "novaops-outlet-overlay-change";
const OVERLAY_ATTR = "data-novaops-outlet-overlay";

let overlayCount = 0;

function syncOverlayAttribute() {
  if (typeof document === "undefined") return;
  if (overlayCount > 0) {
    document.documentElement.setAttribute(OVERLAY_ATTR, "open");
  } else {
    document.documentElement.removeAttribute(OVERLAY_ATTR);
  }
  window.dispatchEvent(new Event(OVERLAY_EVENT));
}

/** Hide outlet bottom nav while fullscreen work surfaces (execution/submit) are open. */
export function setOutletOverlayOpen(open: boolean) {
  overlayCount = Math.max(0, overlayCount + (open ? 1 : -1));
  syncOverlayAttribute();
}

export function subscribeOutletOverlay(callback: () => void) {
  window.addEventListener(OVERLAY_EVENT, callback);
  return () => window.removeEventListener(OVERLAY_EVENT, callback);
}

export function getOutletOverlaySnapshot() {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute(OVERLAY_ATTR) === "open";
}

export function getServerOutletOverlaySnapshot() {
  return false;
}
