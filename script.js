// Pages can choose one of two modes:
// 1) data-manifest="/path/to/manifest.json"  (per-collection file)
// 2) unified mode (default): uses /manifest.json and optional data-category="good-walls"
(function () {
  const GALLERY = document.getElementById("gallery");
  if (!GALLERY) return;

  const manifestPath = GALLERY.dataset.manifest || "/manifest.json";
  const desiredCategory = GALLERY.dataset.category || null;

  function titleCase(s) {
    return s.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function makeFigure(item, base="") {
    const file = item.file;
    const src  = file.startsWith("/") ? file : (base ? `${base}${file}` : `/${file}`);
    const alt  = item.alt || titleCase(file.replace(/^.*\//,"").replace(/\.[^.]+$/,""));
    const cap  = item.caption || alt;

    const fig = document.createElement("figure");

    const a = document.createElement("a");
    a.href = src;                       // click opens the big image
    a.setAttribute("data-lightbox","");

    const img = document.createElement("img");
    img.src = src;                      // display image
    img.alt = alt;
    img.loading = "lazy";
    img.width = 1600; img.height = 1067;

    const fc = document.createElement("figcaption");
    fc.innerHTML = cap;

    a.appendChild(img);
    fig.appendChild(a);
    fig.appendChild(fc);
    return fig;
  }

  async function build() {
    try {
      const res = await fetch(manifestPath, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const all = Array.isArray(data) ? data : (data.photos || []);

      // If the JSON we loaded is a per-folder manifest (files are relative),
      // derive its base folder; otherwise base is empty.
      const base = manifestPath.includes("/") ? manifestPath.replace(/[^/]+$/,"") : "";

      const list = desiredCategory
        ? all.filter(p => (p.category || "").toLowerCase() === desiredCategory.toLowerCase())
        : all;

      GALLERY.innerHTML = "";
      list.forEach(item => GALLERY.appendChild(makeFigure(item, base)));
      hookLightbox();
    } catch (e) {
      console.error(e);
      GALLERY.insertAdjacentHTML("beforeend",
        `<p style="color:#a2a2b0">Couldn’t load photo list (${manifestPath}).</p>`);
    }
  }

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

