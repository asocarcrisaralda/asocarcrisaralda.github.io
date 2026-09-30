/* ASOCARC — comportamiento del sitio (sin dependencias) */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  var WA_MAIN = "573147279929";
  function waLink(number, text) {
    return "https://wa.me/" + number + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  /* ---------- Encabezado: sombra al hacer scroll + barra de progreso ---------- */
  var header = $(".site-header"), bar = $(".progress");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || root.scrollTop;
      if (header) header.classList.toggle("is-scrolled", y > 10);
      if (bar) {
        var max = root.scrollHeight - window.innerHeight;
        bar.style.setProperty("--p", max > 0 ? Math.min(y / max, 1).toFixed(4) : 0);
      }
      if (!reduce) {
        $$("[data-parallax]").forEach(function (el) {
          var k = parseFloat(el.getAttribute("data-parallax")) || 0.1;
          el.style.transform = "translate3d(0," + (y * k).toFixed(1) + "px,0)";
        });
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Menú móvil ---------- */
  var toggle = $(".nav-toggle"), nav = $(".site-nav");
  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    nav.classList.toggle("is-open", open);
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    doc.addEventListener("click", function (e) {
      if (toggle.getAttribute("aria-expanded") === "true" && !nav.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
  }

  /* ---------- Aparición al hacer scroll ---------- */
  var reveals = $$(".reveal");
  if (reveals.length) {
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("is-in"); });
    }
  }

  /* ---------- "Leer más" genérico ---------- */
  $$("[data-readmore]").forEach(function (btn) {
    var target = doc.getElementById(btn.getAttribute("data-readmore"));
    if (!target) return;
    var label = $("span", btn), more = btn.getAttribute("data-more") || "Leer más", less = btn.getAttribute("data-less") || "Leer menos";
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      target.classList.toggle("is-open", open);
      target.style.maxHeight = open ? target.scrollHeight + "px" : "0px";
      if (label) label.textContent = open ? less : more;
    });
  });

  /* ---------- Lightbox ---------- */
  var lb = $("#lightbox");
  if (lb && typeof lb.showModal === "function") {
    var lbImg = $("img", lb), lbCap = $(".lb-cap", lb), items = [], idx = 0;
    function collect() {
      items = $$("[data-lightbox]").map(function (el) {
        return { src: el.getAttribute("data-lightbox"), alt: el.getAttribute("data-alt") || "", cap: el.getAttribute("data-caption") || el.getAttribute("data-alt") || "", el: el };
      });
    }
    function show(i) {
      idx = (i + items.length) % items.length;
      var it = items[idx];
      lbImg.src = it.src; lbImg.alt = it.alt; lbCap.textContent = it.cap;
      var multi = items.length > 1;
      $(".lb-prev", lb).hidden = !multi; $(".lb-next", lb).hidden = !multi;
    }
    collect();
    items.forEach(function (it, i) {
      it.el.addEventListener("click", function (e) { e.preventDefault(); show(i); lb.showModal(); });
    });
    $(".lb-close", lb).addEventListener("click", function () { lb.close(); });
    $(".lb-prev", lb).addEventListener("click", function () { show(idx - 1); });
    $(".lb-next", lb).addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-stage")) lb.close(); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    lb.addEventListener("close", function () { lbImg.removeAttribute("src"); });
  }

  /* ---------- Catálogo: filtros, opciones y pedido por WhatsApp ---------- */
  var catalog = $("#catalog");
  if (catalog) {
    var cards = $$(".catalog-card", catalog);
    var filters = $$(".filter");
    var count = $("#result-count");

    function applyFilter(cat) {
      var shown = 0;
      cards.forEach(function (c) {
        var match = cat === "all" || (c.getAttribute("data-cat") || "").split(" ").indexOf(cat) !== -1;
        if (match) {
          shown++;
          if (c.hidden) { c.hidden = false; c.classList.remove("is-entering"); void c.offsetWidth; c.classList.add("is-entering"); }
        } else { c.hidden = true; c.classList.remove("is-entering"); }
      });
      filters.forEach(function (f) { f.setAttribute("aria-pressed", f.getAttribute("data-filter") === cat ? "true" : "false"); });
      if (count) count.textContent = shown === 1 ? "Mostrando 1 producto" : "Mostrando " + shown + " productos";
    }
    filters.forEach(function (f) { f.addEventListener("click", function () { applyFilter(f.getAttribute("data-filter")); }); });

    function updateOrder(card) {
      var name = card.getAttribute("data-name"), number = card.getAttribute("data-wa") || WA_MAIN;
      var parts = $$(".opt", card).map(function (o) {
        var on = $('.chip[aria-checked="true"]', o);
        return on ? o.getAttribute("data-group") + ": " + on.getAttribute("data-val") : "";
      }).filter(Boolean);
      var text = "Hola ASOCARC, quisiera hacer un pedido de " + name + (parts.length ? " (" + parts.join(", ") + ")" : "") + ". ¿Me pueden ayudar?";
      var btn = $(".order-btn", card);
      if (btn) btn.href = waLink(number, text);
    }
    cards.forEach(function (card) {
      $$(".opt", card).forEach(function (opt) {
        var chips = $$(".chip", opt);
        chips.forEach(function (chip) {
          chip.addEventListener("click", function () {
            chips.forEach(function (c) { c.setAttribute("aria-checked", c === chip ? "true" : "false"); c.tabIndex = c === chip ? 0 : -1; });
            updateOrder(card);
          });
          chip.addEventListener("keydown", function (e) {
            var i = chips.indexOf(chip), n = null;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") n = chips[(i + 1) % chips.length];
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = chips[(i - 1 + chips.length) % chips.length];
            if (n) { e.preventDefault(); n.focus(); n.click(); }
          });
        });
      });
      updateOrder(card);

      /* descripción larga: recorte + "Ver más" */
      var desc = $(".clamp", card), more = $(".more-link", card);
      if (desc && more) {
        if (desc.scrollHeight <= desc.clientHeight + 2) { more.hidden = true; }
        more.addEventListener("click", function () {
          var open = desc.classList.toggle("is-open");
          more.textContent = open ? "Ver menos" : "Ver más";
          more.setAttribute("aria-expanded", open ? "true" : "false");
        });
      }
    });

    /* ?cat=cafe o #cafe */
    var q = /[?&]cat=([a-z]+)/.exec(location.search);
    if (q && filters.some(function (f) { return f.getAttribute("data-filter") === q[1]; })) applyFilter(q[1]);
  }

  /* ---------- Horario: "Abierto ahora" y día resaltado (hora de Colombia) ---------- */
  var schedule = { 1: [8, 17], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: [8, 17], 6: [8, 13], 0: null };
  function bogotaNow() {
    try {
      var p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { d: days[o.weekday], m: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) { var n = new Date(); return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() }; }
  }
  var now = bogotaNow();
  var slot = schedule[now.d];
  var isOpen = !!slot && now.m >= slot[0] * 60 && now.m < slot[1] * 60;
  $$("[data-status]").forEach(function (el) {
    el.classList.remove("is-open", "is-closed");
    el.classList.add(isOpen ? "is-open" : "is-closed");
    el.textContent = isOpen ? "Abierto ahora" : "Cerrado ahora";
  });
  $$("[data-day]").forEach(function (tr) { if (parseInt(tr.getAttribute("data-day"), 10) === now.d) tr.classList.add("is-today"); });

  /* ---------- Mapa: se carga solo al hacer clic ---------- */
  $$("[data-map]").forEach(function (box) {
    var btn = $("button", box), ph = $(".map-placeholder", box);
    if (!btn) return;
    btn.addEventListener("click", function () {
      var f = doc.createElement("iframe");
      f.title = "Mapa de la sede de ASOCARC en San José, Caldas";
      f.loading = "lazy"; f.referrerPolicy = "no-referrer-when-downgrade";
      f.src = box.getAttribute("data-map");
      box.appendChild(f);
      if (ph) ph.remove();
    });
  });

  /* ---------- Formulario de contacto → WhatsApp / correo ---------- */
  var form = $("#contact-form");
  if (form) {
    function read() {
      var d = {
        name: form.elements.name.value.trim(),
        product: form.elements.product.value,
        msg: form.elements.message.value.trim()
      };
      var ok = true;
      [["name", d.name], ["message", d.msg]].forEach(function (p) {
        var field = form.elements[p[0]].closest(".field");
        var bad = !p[1];
        field.classList.toggle("has-error", bad);
        if (bad) ok = false;
      });
      return ok ? d : null;
    }
    function body(d) {
      return "Hola ASOCARC, soy " + d.name + "." + (d.product ? "\nMe interesa: " + d.product + "." : "") + "\n\n" + d.msg;
    }
    $$("[data-send]", form).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var d = read(); if (!d) { var bad = $(".has-error input, .has-error textarea", form); if (bad) bad.focus(); return; }
        if (b.getAttribute("data-send") === "wa") window.open(waLink(WA_MAIN, body(d)), "_blank", "noopener");
        else location.href = "mailto:asocarc.risaralda@gmail.com?subject=" + encodeURIComponent("Consulta desde la página web") + "&body=" + encodeURIComponent(body(d));
      });
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    $$("input, textarea", form).forEach(function (i) {
      i.addEventListener("input", function () { i.closest(".field").classList.remove("has-error"); });
    });
    /* preselección ?producto=Café */
    var pm = /[?&]producto=([^&]+)/.exec(location.search);
    if (pm && form.elements.product) { try { form.elements.product.value = decodeURIComponent(pm[1].replace(/\+/g, " ")); } catch (e) {} }
  }

  /* ---------- Año del pie ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
