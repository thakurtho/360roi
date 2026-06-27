const WEBHOOK_URL = 'https://aigency-proxy.shweta-314.workers.dev';

/* ── SLIDER STATE ── */
let currentSlide = 0;
let sliderTimer;

function goSlide(n) {
  const slides = document.querySelectorAll('.rpt-slide');
  const dots = document.querySelectorAll('.rpt-dot-btn');
  if (!slides.length) return;
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = (n + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
  clearInterval(sliderTimer);
  sliderTimer = setInterval(() => goSlide(currentSlide + 1), 3500);
}

function nextSlideDir(dir) { goSlide(currentSlide + dir); }

/* ── DOM READY ── */
document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.btype-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      opt.closest('.btype-row').querySelectorAll('.btype-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });

  document.querySelectorAll('.product-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.product-opt').forEach(o => {
        o.classList.remove('active');
        o.style.borderColor = 'rgba(255,255,255,0.15)';
        o.style.background = 'rgba(255,255,255,0.04)';
        o.querySelector('.prod-label').style.color = 'rgba(255,255,255,0.6)';
      });
      opt.classList.add('active');
      opt.style.borderColor = 'var(--teal)';
      opt.style.background = 'rgba(71,206,183,0.08)';
      opt.querySelector('.prod-label').style.color = 'var(--teal)';
    });
  });

  const burger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) mobileMenu.classList.remove('open');
    });
  }

  const sliderEl = document.getElementById('rptSlider');
  if (sliderEl) {
    sliderTimer = setInterval(() => goSlide(currentSlide + 1), 3500);
    document.getElementById('rptPrev')?.addEventListener('click', () => goSlide(currentSlide - 1));
    document.getElementById('rptNext')?.addEventListener('click', () => goSlide(currentSlide + 1));
    document.querySelectorAll('.rpt-dot-btn').forEach(btn => {
      btn.addEventListener('click', () => goSlide(+btn.dataset.slide));
    });
    let touchStartX = 0;
    sliderEl.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
    sliderEl.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) nextSlideDir(diff > 0 ? 1 : -1);
    });
  }

  if (window.location.hash === '#audit-form') {
    document.getElementById('audit-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      document.body.style.overflow = '';
    }
  });

});

function closeMobileMenu() {
  document.getElementById('mobileMenu')?.classList.remove('open');
}

async function handleSubmit(e) {
  e.preventDefault();
  console.log('handleSubmit fired');
  
  const siteUrl        = document.getElementById('f-url').value.trim();
  const email          = document.getElementById('f-email').value.trim();
  const pdp_url        = document.getElementById('f-pdp').value.trim() || null;
  const collection_url = document.getElementById('f-collection').value.trim() || null;
  const btype          = document.querySelector('#main-form .btype-opt.active')?.dataset.value;
  const cms            = document.getElementById('f-cms').value;
  const industry       = document.getElementById('f-industry').value;
  const product        = document.querySelector('.product-opt.active')?.dataset.product || 'r1';
  const btn            = document.getElementById('submit-btn');
  const bar            = document.getElementById('statusBar');
  const dot            = document.getElementById('statusDot');
  const txt            = document.getElementById('statusText');

  if (!siteUrl || !email || !cms || !industry) return;
  try { new URL(siteUrl); } catch(err) {
    bar.classList.add('visible');
    dot.className = 'status-dot error';
    txt.textContent = 'Enter a valid URL including https://';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Creating order...';
  bar.classList.add('visible');
  dot.className = 'status-dot';
  txt.textContent = 'Connecting to payment...';

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: siteUrl, email, type: btype, cms, industry, pdp_url, collection_url, product })
    });

    const data = await res.json();

    if (!data.payment_session_id) throw new Error('No session ID');

    txt.textContent = 'Opening payment...';

    const cashfree = await Cashfree({ mode: 'production' });
    const result = await cashfree.checkout({
      paymentSessionId: data.payment_session_id,
      redirectTarget: '_modal'
    });

    if (result.error) {
      dot.className = 'status-dot error';
      txt.textContent = 'Payment failed — please try again.';
      btn.disabled = false;
      btn.textContent = 'Generate My Audit →';
      document.body.style.overflow = '';
    } else if (result.paymentDetails) {
      document.body.style.overflow = '';
      document.getElementById('main-form').innerHTML = `
        <div style="text-align:center;padding:32px 0;">
          <div style="font-size:48px;margin-bottom:16px;">✅</div>
          <p style="color:var(--teal);font-family:'Nunito Sans',sans-serif;font-size:20px;font-weight:700;margin-bottom:8px;">Payment confirmed!</p>
          <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;">Your audit report will arrive at<br><strong style="color:white;">${email}</strong><br>within 15 minutes.</p>
        </div>`;
    }

  } catch (err) {
    dot.className = 'status-dot error';
    txt.textContent = 'Something went wrong — email hello@360roi.ai';
    btn.disabled = false;
    btn.textContent = 'Generate My Audit →';
    document.body.style.overflow = '';
  }
}

function showLegal(page) {
  document.getElementById('main-site').style.display = 'none';
  document.getElementById('legal-wrap').style.display = 'block';
  document.querySelectorAll('.legal-page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  window.scrollTo(0, 0);
}
function hideLegal() {
  document.getElementById('legal-wrap').style.display = 'none';
  document.getElementById('main-site').style.display = 'block';
  window.scrollTo(0, 0);
}
