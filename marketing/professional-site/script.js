(() => {
  'use strict';
  const menuToggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('nav-menu');
  const galleryImg = document.getElementById('gallery-image');
  const tabs = [...document.querySelectorAll('[data-gallery]')];
  const dialog = document.getElementById('demo-dialog');
  const video = document.getElementById('demo-video');
  const closeBtn = document.getElementById('demo-close');

  const gallery = {
    scoring: {
      src: 'assets/04-scoring-progress-phone.png',
      alt: 'Actual Popz Bowling scoring screen with frames and pin keypad'
    },
    stats: {
      src: 'assets/07-stats-phone.png',
      alt: 'Actual Popz Bowling averages and statistics screen'
    },
    history: {
      src: 'assets/08-history-phone.png',
      alt: 'Actual Popz Bowling session history screen'
    }
  };

  function closeMenu() {
    menu?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open menu');
  }
  menuToggle?.addEventListener('click', () => {
    const opened = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', opened);
    menuToggle.setAttribute('aria-expanded', String(opened));
    menuToggle.setAttribute('aria-label', opened ? 'Close menu' : 'Open menu');
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 890) closeMenu();
  });

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      const item = gallery[tab.dataset.gallery];
      if (!item || !galleryImg) return;
      galleryImg.src = item.src;
      galleryImg.alt = item.alt;
      tabs.forEach(other => {
        const selected = other === tab;
        other.classList.toggle('active', selected);
        other.setAttribute('aria-selected', String(selected));
        other.tabIndex = selected ? 0 : -1;
      });
    });
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + delta + tabs.length) % tabs.length;
      tabs[next].click();
      tabs[next].focus();
    });
  });

  function openDemo() {
    if (!dialog) return;
    closeMenu();
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
      document.body.classList.add('dialog-open');
      if (video) {
        video.currentTime = 0;
        const play = video.play();
        if (play?.catch) play.catch(() => {}); // browser may require user to press Play
      }
    } else {
      window.open('assets/Popz-Bowling-Demo.mp4', '_blank', 'noopener');
    }
  }
  function closeDemo() {
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    if (dialog?.open) dialog.close();
    document.body.classList.remove('dialog-open');
  }
  document.querySelectorAll('[data-video-open]').forEach(btn => btn.addEventListener('click', openDemo));
  closeBtn?.addEventListener('click', closeDemo);
  dialog?.addEventListener('cancel', () => {
    video?.pause();
    document.body.classList.remove('dialog-open');
  });
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) closeDemo();
  });
})();