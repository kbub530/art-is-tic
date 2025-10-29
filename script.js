// Build the gallery from photos/manifest.json (no HTML editing needed).
(function () {
  const GALLERY = document.getElementById("gallery");

  function titleCase(s) {
    return s.replace(/[-_]+/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
  }

  function makeFigure(item) {
    // item: { file, alt?, caption? }
    const file = item.file;
    const src  = `photos/${file}`;
    const alt  = item.alt || titleCase(file.replace(/\.[^.]+$/, ""));
    const cap  = item.caption || titleCase(file.replace(/\.[^.]+$/, ""));

    const fig = document.createElement("figure");

    const a = document.createElement("a");
    a.href = src;
    a.setAttribute("data-lightbox", "");

    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.loading = "lazy";
    img.width = 1600;
    img.height = 1067;

    const fc = document.createElement("figcaption");
    fc.innerHTML = cap;

    a.appendChild(img);
    fig.appendChild(a);
    fig.appendChild(fc);
    return fig;
  }

  async function build() {
    try {
      const res = await fetch("photos/manifest.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Allow either {photos:[...]} or [...] JSON formats
      const list = Array.isArray(data) ? data : (data.photos || []);
      GALLERY.innerHTML = "";
      list.forEach(item => GALLERY.appendChild(makeFigure(item)));
      hookLightbox(); // enable the pop-up viewer
    } catch (e) {
      console.error("Failed to build gallery:", e);
      GALLERY.insertAdjacentHTML("beforeend",
        `<p style="color:#a2a2b0">Couldn’t load photo list. Check photos/manifest.json.</p>`);
    }
  }

  // Tiny lightbox
  function hookLightbox() {
    let lb = document.getElementById("lightbox");
    if (!lb) {
      lb = document.createElement("div");
      lb.id = "lightbox";
      lb.hidden = true;
      lb.innerHTML = `
        <button id="lightbox-close" aria-label="Close">×</button>
        <img id="lightbox-img" alt="Expanded photo">
        <figcaption id="lightbox-cap"></figcaption>`;
      document.body.appendChild(lb);
    }
    const img = document.getElementById("lightbox-img");
    const cap = document.getElementById("lightbox-cap");
    const closeBtn = document.getElementById("lightbox-close");

    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[data-lightbox]');
      if (!a) return;
      e.preventDefault();
      img.src = a.getAttribute("href");
      const fc = a.parentElement.querySelector("figcaption");
      cap.textContent = fc ? fc.textContent : "";
      lb.hidden = false;
    });

    function closeLB(){ lb.hidden = true; img.src = ""; }
    closeBtn.addEventListener("click", closeLB);
    document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeLB(); });
    lb.addEventListener("click", (e)=>{ if(e.target === lb) closeLB(); });
  }

  build();
})();
