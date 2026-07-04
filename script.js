/* ── CONFIG ── */
const WEBHOOK_URL = 'https://aigency-proxy.shweta-314.workers.dev';

const PRICES = {
  r1:     { amount: 1,  label: 'Audit Report' },
  bundle: { amount: 2,  label: 'Audit + Fix Guide' }
};

/* ── DOM READY ── */
document.addEventListener('DOMContentLoaded', () => {
  initBtypeOpts();
  initProductOpts();
  initSlider();
  initNavBurger();
  initFormSubmit();
  handleHashScroll();
});

/* ── BUSINESS TYPE SELECTION ── */
function initBtypeOpts() {
  const opts = document.querySelectorAll('.btype-opt');
  opts.forEach(opt => {
    opt.addEventListener('click', () => selectBtype(opt));
    opt.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectBtype(opt); }
    });
  });
}

function selectBtype(selected) {
  document.querySelectorAll('.btype-opt').forEach(o => {
    o.classList.remove('active');
    o.setAttribute('aria-checked', 'false');
  });
  selected.classList.add('active');
  selected.setAttribute('aria-checked', 'true');
}

/* ── PRODUCT SELECTION ── */
function initProductOpts() {
  const opts = document.querySelectorAll('.product-opt');
  opts.forEach(opt => {
    opt.addEventListener('click', () => selectProduct(opt));
    opt.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectProduct(opt); }
    });
  });
}

function selectProduct(selected) {
  document.querySelectorAll('.product-opt').forEach(o => {
    o.classList.remove('active');
    o.setAttribute('aria-checked', 'false');
  });
  selected.classList.add('active');
  selected.setAttribute('aria-checked', 'true');
}

/* ── STEP CTA — pre-select bundle if clicking step 2 CTA ── */
document.addEventListener('DOMContentLoaded', () => {
  const bundleCta = document.querySelector('.step-card.s2 .step-cta');
  if (bundleCta) {
    bundleCta.addEventListener('click', () => {
      const bundleOpt = document.querySelector('.product-opt[data-product="bundle"]');
      if (bundleOpt) selectProduct(bundleOpt);
    });
  }
});

/* ── REPORT SLIDER ── */
function initSlider() {
  const slides = document.querySelectorAll('.rpt-slide');
  const dots = document.querySelectorAll('.rpt-dot-btn');
  if (!slides.length) return;

  let current = 0;
  let timer = setInterval(() => goTo((current + 1) % slides.length), 3500);

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    dots[current].setAttribute('aria-selected', 'false');
    current = idx;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    dots[current].setAttribute('aria-selected', 'true');
  }

  document.getElementById('rptPrev')?.addEventListener('click', () => {
    clearInterval(timer);
    goTo((current - 1 + slides.length) % slides.length);
    timer = setInterval(() => goTo((current + 1) % slides.length), 3500);
  });

  document.getElementById('rptNext')?.addEventListener('click', () => {
    clearInterval(timer);
    goTo((current + 1) % slides.length);
    timer = setInterval(() => goTo((current + 1) % slides.length), 3500);
  });

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      clearInterval(timer);
      goTo(idx);
      timer = setInterval(() => goTo((current + 1) % slides.length), 3500);
    });
  });
}

/* ── NAV BURGER ── */
function initNavBurger() {
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('mobileMenu');
  if (!burger || !menu) return;

  burger.addEventListener('click', () => {
    const isOpen = menu.classList.contains('open');
    menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(!isOpen));
    menu.setAttribute('aria-hidden', String(isOpen));
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });
}

function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const burger = document.getElementById('navBurger');
  if (!menu) return;
  menu.classList.remove('open');
  burger?.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ── FORM SUBMIT ── */
function initFormSubmit() {
  const form = document.getElementById('main-form');
  if (!form) return;
  form.addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();

  const url        = document.getElementById('f-url')?.value.trim();
  const pdpUrl     = document.getElementById('f-pdp')?.value.trim();
  const collUrl    = document.getElementById('f-collection')?.value.trim();
  const email      = document.getElementById('f-email')?.value.trim();
  const phone = (document.getElementById('f-phone-cc')?.value || '+91') + document.getElementById('f-phone')?.value.trim();
  const cms        = document.getElementById('f-cms')?.value;
  const industry   = document.getElementById('f-industry')?.value;
  const btypeEl    = document.querySelector('.btype-opt.active');
  const productEl  = document.querySelector('.product-opt.active');
  const btype      = btypeEl?.dataset.value || 'd2c_product';
  const product    = productEl?.dataset.product || 'r1';

  const btn  = document.getElementById('submit-btn');
  const dot  = document.getElementById('statusDot');
  const txt  = document.getElementById('statusText');
  const bar  = document.getElementById('statusBar');

  // Validation
  if (!url || !email || !cms || !industry) {
    setStatus('error', 'Please fill in all required fields.');
    return;
  }
  try { new URL(url); } catch {
    setStatus('error', 'Enter a valid URL including https://');
    return;
  }
  if (!btypeEl) {
    setStatus('error', 'Please select a business type.');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Processing payment...';
  setStatus('', 'Redirecting to payment...');

  try {
    const payload = {
      url, email,phone,
      business_type: btype,
      cms_platform: cms,
      industry,
      pdp_url: pdpUrl || '',
      collection_url: collUrl || '',
      product,
      amount: PRICES[product].amount
    };

    // Call Cloudflare Worker to create Cashfree order
    const orderRes = await fetch(WEBHOOK_URL + '/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!orderRes.ok) throw new Error('Order creation failed');
    const orderData = await orderRes.json();

    if (!orderData.payment_session_id) throw new Error('No session ID returned');

    // Open Cashfree payment
    const cashfree = Cashfree({ mode: 'production' });
    const result = await cashfree.checkout({
      paymentSessionId: orderData.payment_session_id,
      redirectTarget: '_modal'
    });

    if (result.error) throw new Error(result.error.message || 'Payment failed');

    // Payment success
    showThankYou(email);

  } catch (err) {
    console.error(err);
    setStatus('error', 'Something went wrong — email hello@360roi.ai');
    btn.disabled = false;
    btn.textContent = 'Generate My Audit →';
  }
}

function setStatus(type, message) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  if (dot) dot.className = 'status-dot' + (type ? ' ' + type : '');
  if (txt) txt.textContent = message;
}

/* ── THANK YOU ── */
function showThankYou(email) {
  document.getElementById('main-site').style.display = 'none';
  const tyWrap = document.getElementById('thankyou-wrap');
  const tyEmail = document.getElementById('ty-email');
  if (tyEmail) tyEmail.textContent = email;
  tyWrap.classList.add('visible');
  window.scrollTo(0, 0);
}

/* ── LEGAL PAGES ── */
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

/* ── HASH SCROLL ── */
function handleHashScroll() {
  if (window.location.hash === '#audit-form') {
    setTimeout(() => {
      document.getElementById('audit-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
}
