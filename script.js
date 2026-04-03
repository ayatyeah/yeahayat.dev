const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  },
  {
    threshold: 0.15,
    rootMargin: '0px 0px -30px 0px'
  }
);

function initReveal(root = document) {
  const revealItems = Array.from(root.querySelectorAll('.reveal'));

  revealItems.forEach((item, index) => {
    item.classList.remove('visible');
    item.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
    revealObserver.observe(item);
  });
}

function initYear() {
  const yearNode = document.getElementById('year');
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
}

function initCodingDays() {
  const codingDaysNode = document.getElementById('codingDays');
  if (!codingDaysNode) {
    return;
  }

  const startDate = new Date('2023-09-01T00:00:00');
  const now = new Date();

  const startUtc = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.max(0, Math.floor((nowUtc - startUtc) / 86400000));

  codingDaysNode.textContent = String(days);
}

function initParallax() {
  if (window.__yaParallaxBound) {
    return;
  }

  window.__yaParallaxBound = true;

  window.addEventListener('pointermove', (event) => {
    const yaTracks = Array.from(document.querySelectorAll('.ya-track'));
    if (yaTracks.length === 0) {
      return;
    }

    const x = (event.clientX / window.innerWidth - 0.5) * 22;
    const y = (event.clientY / window.innerHeight - 0.5) * 14;

    yaTracks.forEach((track, index) => {
      const factor = index + 1;
      track.style.setProperty('--mx', `${x / factor}px`);
      track.style.setProperty('--my', `${y / (factor + 1)}px`);
    });
  });
}

function initPage(root = document) {
  initReveal(root);
  initYear();
  initCodingDays();
}

let isNavigating = false;

async function navigateSeamlessly(url, { pushHistory = true, resetScroll = true } = {}) {
  if (isNavigating) {
    return;
  }

  isNavigating = true;
  document.body.classList.add('is-routing');

  try {
    const response = await fetch(url, {
      headers: {
        'X-Requested-With': 'spa-navigation'
      }
    });

    if (!response.ok) {
      throw new Error(`Navigation failed: ${response.status}`);
    }

    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');

    const incomingMain = parsed.querySelector('main.page-main');
    const incomingFooter = parsed.querySelector('footer.footer');
    const currentMain = document.querySelector('main.page-main');
    const currentFooter = document.querySelector('footer.footer');

    if (!incomingMain || !incomingFooter || !currentMain || !currentFooter) {
      window.location.href = url;
      return;
    }

    const applyDomSwap = () => {
      currentMain.replaceWith(incomingMain);
      currentFooter.replaceWith(incomingFooter);

      document.title = parsed.title;

      const nextPage = parsed.body.getAttribute('data-page');
      if (nextPage) {
        document.body.setAttribute('data-page', nextPage);
      }

      if (pushHistory) {
        window.history.pushState({}, '', url);
      }

      if (resetScroll) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }

      initPage(document);
    };

    if (document.startViewTransition) {
      await document.startViewTransition(applyDomSwap).finished;
    } else {
      applyDomSwap();
    }
  } catch (error) {
    window.location.href = url;
  } finally {
    isNavigating = false;
    document.body.classList.remove('is-routing');
  }
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-nav-link="true"]');
  if (!link) {
    return;
  }

  if (link.target && link.target !== '_self') {
    return;
  }

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:')) {
    return;
  }

  const targetUrl = new URL(href, window.location.href);
  if (targetUrl.origin !== window.location.origin) {
    return;
  }

  const currentUrl = new URL(window.location.href);
  if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  navigateSeamlessly(targetUrl.href, { pushHistory: true, resetScroll: true });
});

window.addEventListener('popstate', () => {
  navigateSeamlessly(window.location.href, { pushHistory: false, resetScroll: false });
});

initParallax();
initPage(document);
