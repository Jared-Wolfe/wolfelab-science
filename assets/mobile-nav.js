(() => {
  const toggle = document.querySelector(".site-menu-toggle");
  if (!toggle) return;

  const menu = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!menu) return;

  const icon = toggle.querySelector(".site-menu-icon");
  const label = toggle.querySelector(".site-menu-label");

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    if (icon) icon.textContent = open ? "×" : "☰";
    if (label) label.textContent = open ? "Close" : "Menu";
  }

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  const desktop = window.matchMedia("(min-width: 761px)");
  const closeAtDesktop = (event) => {
    if (event.matches) setOpen(false);
  };
  desktop.addEventListener?.("change", closeAtDesktop);
})();
