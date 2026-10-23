// The page's sizing unit. The CSS runways use 100vh (the large viewport on mobile), so measure that
// same unit rather than innerHeight, which shrinks while a mobile browser toolbar is showing.
let probe: HTMLDivElement | null = null;

export const viewportH = () => {
  if (!probe || !probe.isConnected) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
  }
  return Math.max(probe.offsetHeight || window.innerHeight, 560);
};
