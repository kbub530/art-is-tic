/* ART IS TIC — gallery logic
   ─────────────────────────────────────────────────────────────
   This file reads /manifest.json — which GitHub writes for you
   automatically from whatever is in the photos/ folder — and
   builds the collection tabs, the photo wall, and the lightbox.

   You should never need to edit this file to add photos. */

(function () {
  "use strict";

  var gallery = document.getElementById("gallery");
  var tabsNav = document.getElementById("tabs");
  var yearEl  = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (!gallery || !tabsNav) return;

  var photos = [];      // every photo, in site order
  var cats = [];        // collection ids, e.g. ["abstract", "good-walls"]
  var current = "all";
  var items = [];       // photos currently on screen
  var lbIndex = -1;
  var rendered = false;

  function pretty(s) {
    return s.replace(/[-_]+/g, " ").trim().replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  /* ── load the photo list ─────────────────────────────────── */

  fetch("/manifest.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      photos = data.photos || [];
      photos.forEach(function (p) {
        if (cats.indexOf(p.category) === -1) cats.push(p.category);
      });
      buildTabs();
      applyHash();
      window.addEventListener("hashchange", applyHash);
    })
    .catch(function (err) {
      console.error(err);
      gallery.innerHTML =
        '<p class="gallery-note">The photo list hasn\u2019t been published yet. ' +
        "If you just set things up, give the build a minute and refresh.</p>";
    });

  /* ── collection tabs ─────────────────────────────────────── */

  function buildTabs() {
    tabsNav.innerHTML = "";
    makeTab("all", "all");
    cats.forEach(function (c) { makeTab(c, pretty(c).toLowerCase()); });
  }

  function makeTab(id, label) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tab";
    b.textContent = label;
    b.dataset.cat = id;
    b.setAttribute("aria-pressed", String(id === current));
    b.addEventListener("click", function () {
      if (id === "all") {
        history.replaceState(null, "", location.pathname);
        setCat("all");
      } else {
        location.hash = "c/" + id;   // hashchange event does the rest
      }
    });
    tabsNav.appendChild(b);
  }

  /* Collection links look like  /#c/good-walls  — shareable, and the
     old /good-walls/ style links redirect here too. Plain anchors
     like #about are left alone. */
  function applyHash() {
    var h = location.hash;
    if (h.indexOf("#c/") === 0) {
      var id = decodeURIComponent(h.slice(3));
      setCat(cats.indexOf(id) !== -1 ? id : "all");
    } else if (!h) {
      setCat("all");            // e.g. back button from a collection link
    } else if (!rendered) {
      setCat("all");            // arriving directly at /#about etc.
    }
  }

  function setCat(id) {
    current = id;
    rendered = true;
    Array.prototype.forEach.call(tabsNav.children, function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.cat === id));
    });
    renderGallery();
  }

  /* ── the photo wall ──────────────────────────────────────── */

  function renderGallery() {
    items = current === "all"
      ? photos
      : photos.filter(function (p) { return p.category === current; });

    gallery.innerHTML = "";

    if (!items.length) {
      gallery.innerHTML = '<p class="gallery-note">No photos here yet.</p>';
      return;
    }

    items.forEach(function (p, i) {
      var fig = document.createElement("figure");
      fig.className = "shot";
      fig.style.setProperty("--r", (p.width / p.height).toFixed(4));

      var a = document.createElement("a");
      a.href = encodeURI(p.large);
      a.addEventListener("click", function (e) {
        e.preventDefault();
        openLightbox(i);
      });

      var img = document.createElement("img");
      img.alt = p.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("load", function () {
        fig.classList.add("loaded");
      }, { once: true });
      img.src = encodeURI(p.thumb);
      if (img.complete && img.naturalWidth) fig.classList.add("loaded");

      a.appendChild(img);
      fig.appendChild(a);

      if (p.caption) {
        var fc = document.createElement("figcaption");
        fc.textContent = p.caption;
        fig.appendChild(fc);
      }

      gallery.appendChild(fig);
    });
  }

  /* ── lightbox ────────────────────────────────────────────── */

  var lb, lbImg, lbCap, lbCount, swiped = false;

  function ensureLightbox() {
    if (lb) return;

    lb = document.createElement("div");
    lb.id = "lightbox";
    lb.hidden = true;
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Photo viewer");
    lb.innerHTML =
      '<button class="lb-btn lb-close" aria-label="Close">\u00d7</button>' +
      '<button class="lb-btn lb-prev" aria-label="Previous photo">\u2039</button>' +
      '<button class="lb-btn lb-next" aria-label="Next photo">\u203a</button>' +
      '<figure><img id="lb-img" alt="">' +
      '<figcaption><span id="lb-cap"></span><span id="lb-count"></span></figcaption></figure>';
    document.body.appendChild(lb);

    lbImg = lb.querySelector("#lb-img");
    lbCap = lb.querySelector("#lb-cap");
    lbCount = lb.querySelector("#lb-count");
    lbImg.draggable = false;

    lb.querySelector(".lb-close").addEventListener("click", closeLightbox);
    lb.querySelector(".lb-prev").addEventListener("click", function () { step(-1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { step(1); });

    lb.addEventListener("click", function (e) {
      if (swiped) { swiped = false; return; }
      if (e.target === lb) closeLightbox();
    });

    // swipe left / right on touch screens
    var x0 = null;
    lb.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    lb.addEventListener("pointerup", function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) {
        swiped = true;
        step(dx > 0 ? -1 : 1);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

  function openLightbox(i) {
    ensureLightbox();
    lb.hidden = false;
    document.body.classList.add("no-scroll");
    show(i);
    lb.querySelector(".lb-close").focus();
  }

  function show(i) {
    lbIndex = (i + items.length) % items.length;
    var p = items[lbIndex];
    lbImg.src = encodeURI(p.large);
    lbImg.alt = p.alt || "";
    lbCap.textContent = p.caption || "";
    lbCount.textContent = items.length > 1 ? (lbIndex + 1) + " / " + items.length : "";

    // quietly pre-load the neighbours so arrows feel instant
    [1, -1].forEach(function (d) {
      var q = items[(lbIndex + d + items.length) % items.length];
      if (q) { var pre = new Image(); pre.src = encodeURI(q.large); }
    });
  }

  function step(d) { show(lbIndex + d); }

  function closeLightbox() {
    lb.hidden = true;
    lbImg.src = "";
    document.body.classList.remove("no-scroll");
  }
})();
