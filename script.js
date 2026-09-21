(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById('siteHeader');
  function onScroll() {
    /* hysteresis: on (>24px) and off (<4px) use different thresholds, so scroll jitter / rubber-banding near the top
       can't flip the header between transparent and solid over and over */
    var y = window.scrollY;
    var solid = header.classList.contains('is-scrolled');
    if (header.hasAttribute('data-solid') || y > 24) {
      if (!solid) header.classList.add('is-scrolled');
    } else if (y < 4 && solid) {
      header.classList.remove('is-scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Stable hero height ----------
     The hero is exactly one screen on phones/tablets, but its height is frozen at load instead of tracking the live
     viewport, so collapsing/expanding the browser's address bar never resizes the photo or moves the headline.
     Only a width change (rotation) re-measures. */
  var rootStyle = document.documentElement.style;
  var heroW = 0;
  function freezeHeroHeight() {
    var w = window.innerWidth;
    if (w === heroW) return;
    heroW = w;
    rootStyle.setProperty('--hero-h', window.innerHeight + 'px');
  }
  freezeHeroHeight();
  window.addEventListener('resize', freezeHeroHeight);

  /* ---------- Mobile nav drawer ---------- */
  var menuToggle = document.getElementById('menuToggle');
  var navDrawer = document.getElementById('navDrawer');
  var navBackdrop = document.getElementById('navBackdrop');
  var navDrawerClose = document.getElementById('navDrawerClose');

  /* While the drawer / lightbox is open the page behind is inert: Tab can't leave the overlay and screen readers
     don't read the content underneath. (The patient-portal <dialog> already does this natively via showModal.)
     Marking the whole page inert forces a big style + accessibility-tree rebuild. Done in the tap's own frame it made the
     overlay's first frames stutter on phones, so it is applied (and lifted) after the overlay's animation has finished. */
  var OVERLAY_MS = 340;   /* a little over the drawer's 320ms slide and the lightbox's 260ms fade */
  var inertTargets = document.querySelectorAll('.skip-link, .site-header, main, footer, #fabWhatsapp');
  var inertTimer = null;
  function setBackgroundInert(on, delay, done) {
    clearTimeout(inertTimer);
    function apply() {
      inertTargets.forEach(function (el) { el.inert = on; });
      if (done) done();
    }
    if (delay) inertTimer = setTimeout(apply, delay); else apply();
  }
  /* html carries overflow-x: clip, so an overflow set on <body> no longer reaches the viewport: lock both or the page
     keeps scrolling behind the open menu */
  function lockPageScroll(on) {
    var v = on ? 'hidden' : '';
    document.documentElement.style.overflow = v;
    document.body.style.overflow = v;
  }

  function openDrawer() {
    navDrawer.classList.add('is-open');
    navBackdrop.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    lockPageScroll(true);
    navDrawerClose.focus();
    setBackgroundInert(true, OVERLAY_MS);
  }
  function hideDrawer(delay) {
    if (!navDrawer.classList.contains('is-open')) return;
    navDrawer.classList.remove('is-open');
    navBackdrop.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    lockPageScroll(false);
    /* focus goes back to the menu button once the page is interactive again */
    setBackgroundInert(false, delay, function () { menuToggle.focus(); });
  }
  function closeDrawer() { hideDrawer(OVERLAY_MS); }
  menuToggle.addEventListener('click', openDrawer);
  navDrawerClose.addEventListener('click', closeDrawer);
  navBackdrop.addEventListener('click', closeDrawer);
  navDrawer.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeDrawer);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navDrawer.classList.contains('is-open')) closeDrawer();
  });

  /* ---------- Patient portal dialog ---------- */
  var userBtn = document.getElementById('userBtn');
  var drawerUsuario = document.getElementById('drawerUsuario');
  var userDialog = document.getElementById('userDialog');
  var userDialogClose = document.getElementById('userDialogClose');

  function openUserDialog(e) {
    if (e) e.preventDefault();
    /* immediately (no animation wait): the dialog remembers the focused element and gives focus back to it when it closes */
    hideDrawer(0);
    userDialog.showModal();
  }
  userBtn.addEventListener('click', openUserDialog);
  drawerUsuario.addEventListener('click', openUserDialog);
  userDialogClose.addEventListener('click', function () { userDialog.close(); });
  userDialog.addEventListener('click', function (e) {
    var rect = userDialog.getBoundingClientRect();
    var inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) userDialog.close();
  });

  /* ---------- Reveal-on-scroll system ----------
     data-reveal="fade-up|fade-left|fade-right|scale"
     data-reveal-group wraps children that stagger together
  */
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealGroups = document.querySelectorAll('[data-reveal-stagger]');
    revealGroups.forEach(function (group) {
      var items = Array.prototype.slice.call(group.querySelectorAll('[data-reveal]'));
      items.forEach(function (el, i) { el.dataset.staggerIndex = i; });
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var idx = el.dataset.staggerIndex ? parseInt(el.dataset.staggerIndex, 10) : 0;
          el.style.transitionDelay = Math.min(idx * 70, 420) + 'ms';
          el.classList.add('is-visible');
          /* the stagger delay is only for the reveal: drop it afterwards, or it would also delay every later transition
             on the element (e.g. the gallery strips opening on hover) */
          el.addEventListener('transitionend', function clearDelay(ev) {
            if (ev.target !== el || ev.propertyName !== 'opacity') return;
            el.style.transitionDelay = '';
            el.removeEventListener('transitionend', clearDelay);
          });
          io.unobserve(el);
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );

    /* read every rect first, then write: interleaving them forces a layout per element */
    var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    var viewH = window.innerHeight;
    var revealRects = revealEls.map(function (el) { return el.getBoundingClientRect(); });
    revealEls.forEach(function (el, i) {
      var rect = revealRects[i];
      if (rect.top < viewH * 0.92 && rect.bottom > 0) {
        el.classList.add('is-visible');
      } else {
        io.observe(el);
      }
    });
  } else {
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ---------- Gallery lightbox ---------- */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCaption = document.getElementById('lightboxCaption');
  var lightboxClose = document.getElementById('lightboxClose');
  var galleryItems = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
  var lastFocused = null;

  function openLightbox(item) {
    var img = item.querySelector('img');
    var caption = item.getAttribute('data-caption') || '';
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = caption;
    lastFocused = document.activeElement;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    lockPageScroll(true);
    lightboxClose.focus();
    setBackgroundInert(true, OVERLAY_MS);
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    lockPageScroll(false);
    lightboxImg.src = '';
    setBackgroundInert(false, OVERLAY_MS, function () { if (lastFocused) lastFocused.focus(); });
  }
  if (lightbox) {
    galleryItems.forEach(function (item) {
      item.addEventListener('click', function () { openLightbox(item); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(item);
        }
      });
    });
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  }

  /* ---------- Gallery carousel (phones): dots + which photo is current ----------
     On phones the grid is a native scroll-snap carousel (see styles.css). The dots are plain buttons, hidden by CSS on
     wider screens; the current one follows the photo that is snapped into view. */
  var galleryGrid = document.querySelector('.gallery-grid');
  if (galleryGrid && galleryItems.length > 1) {
    var galleryDots = document.createElement('div');
    galleryDots.className = 'gallery-dots';
    galleryDots.setAttribute('role', 'group');
    galleryDots.setAttribute('aria-label', 'Elegir foto');
    var dotButtons = galleryItems.map(function (item, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'gallery-dot';
      dot.setAttribute('aria-label', 'Foto ' + (i + 1) + ' de ' + galleryItems.length);
      dot.addEventListener('click', function () {
        item.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', inline: 'start', block: 'nearest' });
      });
      galleryDots.appendChild(dot);
      return dot;
    });
    galleryGrid.insertAdjacentElement('afterend', galleryDots);

    /* Desktop strips: the last photo pointed at / focused stays open (the first one by default). CSS only uses this on
       wide screens with a mouse; on phones and tablets the class is inert. */
    var setOpenPhoto = function (index) {
      galleryItems.forEach(function (item, i) { item.classList.toggle('is-active', i === index); });
    };
    setOpenPhoto(0);
    galleryItems.forEach(function (item, i) {
      item.addEventListener('mouseenter', function () { setOpenPhoto(i); });
      item.addEventListener('focus', function () { setOpenPhoto(i); });
    });

    var setCurrentPhoto = function (index) {
      dotButtons.forEach(function (dot, i) {
        if (i === index) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current');
      });
    };
    setCurrentPhoto(0);
    if ('IntersectionObserver' in window) {
      var photoIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setCurrentPhoto(galleryItems.indexOf(entry.target));
        });
      }, { root: galleryGrid, threshold: 0.6 });
      galleryItems.forEach(function (item) { photoIO.observe(item); });
    }
  }

  /* ---------- WhatsApp FAB: delayed entrance, hidden while hero CTAs are in view ---------- */
  var fab = document.getElementById('fabWhatsapp');
  var hero = document.getElementById('inicio');
  if (fab) {
    var fabDelayDone = reduceMotion;
    var fabHeroClear = !hero;
    var syncFab = function () {
      fab.classList.toggle('is-visible', fabDelayDone && fabHeroClear);
    };
    if (!reduceMotion) {
      window.setTimeout(function () { fabDelayDone = true; syncFab(); }, 1800);
    }
    if (hero && 'IntersectionObserver' in window) {
      var heroIO = new IntersectionObserver(function (entries) {
        fabHeroClear = !entries[0].isIntersecting;
        syncFab();
      }, { threshold: 0 });
      heroIO.observe(hero);
    }
    syncFab();
  }
})();
