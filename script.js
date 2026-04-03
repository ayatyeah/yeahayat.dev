const revealItems = Array.from(document.querySelectorAll('.reveal'));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.15,
    rootMargin: '0px 0px -30px 0px'
  }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
  observer.observe(item);
});

const yaTracks = Array.from(document.querySelectorAll('.ya-track'));

if (yaTracks.length > 0) {
  window.addEventListener('pointermove', (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 22;
    const y = (event.clientY / window.innerHeight - 0.5) * 14;

    yaTracks.forEach((track, index) => {
      const factor = index + 1;
      track.style.setProperty('--mx', `${x / factor}px`);
      track.style.setProperty('--my', `${y / (factor + 1)}px`);
    });
  });
}

document.body.classList.add('page-enter');
setTimeout(() => {
  document.body.classList.remove('page-enter');
}, 760);

const internalLinks = Array.from(document.querySelectorAll('a[data-nav-link="true"]'));
let isLeaving = false;

internalLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');

    if (!href || href.startsWith('#') || href.startsWith('mailto:')) {
      return;
    }

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const targetPath = href.split('#')[0].trim();

    if (currentPath === targetPath || isLeaving) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    isLeaving = true;
    document.body.classList.add('page-leave');

    setTimeout(() => {
      window.location.href = href;
    }, 580);
  });
});

const yearNode = document.getElementById('year');
if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

const codingDaysNode = document.getElementById('codingDays');
if (codingDaysNode) {
  const startDate = new Date('2023-09-01T00:00:00');
  const now = new Date();

  const startUtc = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const days = Math.max(0, Math.floor((nowUtc - startUtc) / 86400000));
  codingDaysNode.textContent = String(days);
}
