// Build the gallery from whatever manifest the page asks for.
(function () {
  const GALLERY = document.getElementById("gallery");

  // Get manifest path from data-manifest or default to /photos/manifest.json
  const manifestPath =
    (GALLERY && GALLERY.dataset.manifest) || "/photos/manifest.json";

  // Derive a base folder from the manifest path so "file" can be just a filename
  const base = manifestPath.replace(/[^/]+$/, ""); // e.g., "/photos/good-walls/"

  function titleCase(s) {
    return s.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function makeFigure(item) {
    const file = item.file;
    const src  = `${base}${file}`;
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
      const res = await fetch(manifestPath, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.photos || []);
      GALLERY.innerHTML = "";
      list.forEach(item => GALLERY.appendChild(makeFigure(item)));
      hookLightbox();
    } catch (e) {
      console.error("Failed to build gallery:", e);
      GALLERY.insertAdjacentHTML("beforeend",
        `<p style="color:#a2a2b0">Couldn’t load photo list: ${manifestPath}</p>`);
    }
  }

  function hookLightbox() {
    let lb = document.getElementById("lightbox");
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
