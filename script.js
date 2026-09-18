(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById('siteHeader');
  function onScroll() {
    if (window.scrollY > 24) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav drawer ---------- */
  var menuToggle = document.getElementById('menuToggle');
  var navDrawer = document.getElementById('navDrawer');
  var navBackdrop = document.getElementById('navBackdrop');
  var navDrawerClose = document.getElementById('navDrawerClose');

  function openDrawer() {
    navDrawer.classList.add('is-open');
    navBackdrop.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    navDrawerClose.focus();
  }
  function closeDrawer() {
    navDrawer.classList.remove('is-open');
    navBackdrop.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    menuToggle.focus();
  }
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
    closeDrawer();
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
          io.unobserve(el);
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );

    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var alreadyVisible = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
      if (alreadyVisible) {
        el.classList.add('is-visible');
        return;
      }
      io.observe(el);
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
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lightboxImg.src = '';
    if (lastFocused) lastFocused.focus();
  }
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
