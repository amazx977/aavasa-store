/**
 * AAVASA / The Bold Rose Luxury Perfumes
 * Main Application Orchestrator & UI Interactions
 */

const App = (function () {
  let currentCategory = 'all';
  let currentSort = 'featured';

  // Scent Finder Quiz State
  let quizStep = 1;
  const quizAnswers = {
    vibe: null,
    occasion: null,
    notes: null
  };

  function init() {
    renderProducts();
    initFilterAndSort();
    initQuickView();
    initScentQuiz();
    initFAQ();
    initNavigation();
    initHeaderScroll();
    initPageActions();
  }

  function initPageActions() {
    // Event delegation on products grid
    const grid = document.getElementById('productsGrid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'quick-view') {
          openQuickView(id);
        } else if (action === 'add-cart') {
          Cart.addItem(id);
        }
      });
    }

    // Discovery section action buttons
    const orderDiscoveryBtn = document.getElementById('orderDiscoveryTrioBtn');
    if (orderDiscoveryBtn) {
      orderDiscoveryBtn.addEventListener('click', () => Cart.addItem('prod-discovery-trio'));
    }

    const viewMasterCoffretBtn = document.getElementById('viewMasterCoffretBtn');
    if (viewMasterCoffretBtn) {
      viewMasterCoffretBtn.addEventListener('click', () => openQuickView('prod-master-coffret'));
    }

    // Newsletter subscription form
    const newsletterForm = document.getElementById('footerNewsletterForm');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = newsletterForm.querySelector('input[type="email"]');
        if (input) input.value = '';
        Cart.showToast('Thank you for subscribing! Use coupon code AAVASA15 at checkout.', 'green');
      });
    }

    // UPI Copy & Verify buttons in payment modal
    const copyUpiBtn = document.getElementById('copyUpiBtn');
    if (copyUpiBtn) {
      copyUpiBtn.addEventListener('click', () => {
        navigator.clipboard.writeText('aavasa.perfumes@icici').then(() => {
          Cart.showToast('UPI ID copied to clipboard!', 'green');
        });
      });
    }

    const verifyUpiBtn = document.getElementById('verifyUpiBtn');
    if (verifyUpiBtn) {
      verifyUpiBtn.addEventListener('click', () => {
        const upiInput = document.getElementById('userUpiId');
        if (upiInput && upiInput.value.includes('@')) {
          Cart.showToast('UPI ID verified successfully! Click Complete Order below.', 'green');
        } else {
          Cart.showToast('Please enter a valid UPI ID (e.g. name@bank)');
        }
      });
    }

    const continueShoppingBtn = document.getElementById('successContinueShoppingBtn');
    if (continueShoppingBtn) {
      continueShoppingBtn.addEventListener('click', () => Checkout.close());
    }
  }

  /* --------------------------------------------------------------------------
     1. CATALOG RENDERING & FILTERING
     -------------------------------------------------------------------------- */
  function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    let items = [...PRODUCTS_DATA];

    // Filter by scent family
    if (currentCategory !== 'all') {
      items = items.filter(p => p.familyCategory === currentCategory);
    }

    // Sort items
    if (currentSort === 'longevity') {
      items.sort((a, b) => b.longevityScore - a.longevityScore);
    } else if (currentSort === 'price-asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-desc') {
      items.sort((a, b) => b.price - a.price);
    } else if (currentSort === 'rating') {
      items.sort((a, b) => b.rating - a.rating);
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <h3 style="margin-bottom: 8px;">No fragrances found in this category</h3>
          <p style="color: var(--text-muted);">Please select a different category filter.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(p => {
      const notesPills = [
        ...p.notes.top.slice(0, 1),
        ...p.notes.heart.slice(0, 1),
        ...p.notes.base.slice(0, 1)
      ].map(n => `<span class="note-pill">${n.replace(/\(.*?\)/g, '')}</span>`).join('');

      return `
        <article class="product-card" data-id="${p.id}" data-category="${p.familyCategory}">
          <div class="card-media">
            <div class="card-badges">
              <span class="badge ${p.badgeColor === 'green' ? 'badge-green' : 'badge-orange'}">${p.badge}</span>
              <span class="badge badge-cream">6+ Hr Verified</span>
            </div>
            <div class="card-discount-badge">${p.discountPercent}% OFF</div>
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            <div class="card-quick-actions">
              <button class="btn-quick-view" data-action="quick-view" data-id="${p.id}">Quick View</button>
            </div>
          </div>

          <div class="card-info">
            <div class="card-category">
              <span class="category-name">${p.scentFamily}</span>
              <span class="longevity-tag">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                ${p.longevityHours}
              </span>
            </div>

            <h3 class="card-title">${p.name}</h3>
            <p class="card-tagline">${p.tagline}</p>

            <div class="notes-teaser">
              ${notesPills}
            </div>

            <div class="longevity-meter">
              <div class="meter-header">
                <span>Anti-Evaporation Rating</span>
                <span class="score">${p.longevityScore} / 10</span>
              </div>
              <div class="meter-bar">
                <div class="meter-fill" style="width: ${p.longevityScore * 10}%;"></div>
              </div>
            </div>

            <div class="card-footer">
              <div class="price-wrap">
                <span class="current-price">₹${p.price.toLocaleString('en-IN')}</span>
                <span class="compare-price">₹${p.compareAtPrice.toLocaleString('en-IN')}</span>
              </div>
              <button class="btn-add-cart" data-action="add-cart" data-id="${p.id}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                Pre-Order Now
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function initFilterAndSort() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        renderProducts();
      });
    });

    const sortSelect = document.getElementById('catalogSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderProducts();
      });
    }
  }

  /* --------------------------------------------------------------------------
     2. QUICK VIEW MODAL
     -------------------------------------------------------------------------- */
  function initQuickView() {
    const overlay = document.getElementById('quickViewModal');
    const closeBtn = document.getElementById('quickViewCloseBtn');

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeQuickView();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeQuickView);
    }
  }

  function openQuickView(productId) {
    const p = getProductById(productId);
    if (!p) return;

    const overlay = document.getElementById('quickViewModal');
    const imgEl = document.getElementById('qvImg');
    const titleEl = document.getElementById('qvTitle');
    const categoryEl = document.getElementById('qvCategory');
    const taglineEl = document.getElementById('qvTagline');
    const descEl = document.getElementById('qvDesc');
    const priceEl = document.getElementById('qvPrice');
    const compareEl = document.getElementById('qvCompare');
    const topNotesEl = document.getElementById('qvTopNotes');
    const heartNotesEl = document.getElementById('qvHeartNotes');
    const baseNotesEl = document.getElementById('qvBaseNotes');
    const addBtn = document.getElementById('qvAddBtn');
    const whyItLastsEl = document.getElementById('qvWhyItLasts');

    if (imgEl) imgEl.src = p.image;
    if (titleEl) titleEl.textContent = p.name;
    if (categoryEl) categoryEl.textContent = `${p.scentFamily} • ${p.longevityHours}`;
    if (taglineEl) taglineEl.textContent = p.tagline;
    if (descEl) descEl.textContent = p.shortDesc;
    if (priceEl) priceEl.textContent = `₹${p.price.toLocaleString('en-IN')}`;
    if (compareEl) compareEl.textContent = `₹${p.compareAtPrice.toLocaleString('en-IN')}`;
    if (whyItLastsEl) whyItLastsEl.textContent = p.whyItLasts;

    if (topNotesEl) topNotesEl.textContent = p.notes.top.join(', ');
    if (heartNotesEl) heartNotesEl.textContent = p.notes.heart.join(', ');
    if (baseNotesEl) baseNotesEl.textContent = p.notes.base.join(', ');

    if (addBtn) {
      addBtn.onclick = () => {
        Cart.addItem(p.id);
        closeQuickView();
      };
    }

    if (overlay) {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeQuickView() {
    const overlay = document.getElementById('quickViewModal');
    if (overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  /* --------------------------------------------------------------------------
     3. INTERACTIVE SCENT FINDER QUIZ
     -------------------------------------------------------------------------- */
  function initScentQuiz() {
    // Option cards selection
    document.querySelectorAll('.quiz-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const step = parseInt(card.dataset.step, 10);
        const value = card.dataset.value;

        // Deselect siblings in the same step
        const parentGrid = card.parentElement;
        parentGrid.querySelectorAll('.quiz-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        if (step === 1) quizAnswers.vibe = value;
        if (step === 2) quizAnswers.occasion = value;
        if (step === 3) quizAnswers.notes = value;
      });
    });

    const nextBtn = document.getElementById('quizNextBtn');
    const prevBtn = document.getElementById('quizPrevBtn');
    const restartBtn = document.getElementById('quizRestartBtn');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (quizStep === 1 && !quizAnswers.vibe) {
          Cart.showToast('Please select your preferred fragrance vibe');
          return;
        }
        if (quizStep === 2 && !quizAnswers.occasion) {
          Cart.showToast('Please select your primary wear occasion');
          return;
        }

        if (quizStep < 3) {
          setQuizStep(quizStep + 1);
        } else {
          // Calculate Match
          calculateQuizMatch();
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (quizStep > 1) {
          setQuizStep(quizStep - 1);
        }
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        quizAnswers.vibe = null;
        quizAnswers.occasion = null;
        quizAnswers.notes = null;
        document.querySelectorAll('.quiz-option-card').forEach(c => c.classList.remove('selected'));
        const resultWrap = document.getElementById('quizResultWrap');
        const formWrap = document.getElementById('quizFormWrap');
        if (resultWrap) resultWrap.classList.remove('active');
        if (formWrap) formWrap.style.display = 'block';
        setQuizStep(1);
      });
    }
  }

  function setQuizStep(step) {
    quizStep = step;

    document.querySelectorAll('.quiz-step-pane').forEach((pane, idx) => {
      pane.style.display = (idx + 1 === step) ? 'block' : 'none';
    });

    const fill = document.getElementById('quizProgressFill');
    if (fill) {
      fill.style.width = `${(step / 3) * 100}%`;
    }

    const prevBtn = document.getElementById('quizPrevBtn');
    const nextBtn = document.getElementById('quizNextBtn');

    if (prevBtn) prevBtn.style.visibility = step === 1 ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.textContent = step === 3 ? 'Reveal My Fragrance Match ✨' : 'Continue →';
  }

  function calculateQuizMatch() {
    let matchedProductId = 'prod-adore';

    if (quizAnswers.vibe === 'fresh' || quizAnswers.notes === 'citrus') {
      matchedProductId = 'prod-morning-shower';
    } else if (quizAnswers.vibe === 'mysterious' || quizAnswers.notes === 'oud') {
      matchedProductId = 'prod-night-oud';
    } else if (quizAnswers.vibe === 'sophisticated' || quizAnswers.notes === 'woody') {
      matchedProductId = 'prod-timeless';
    } else if (quizAnswers.vibe === 'romantic' && quizAnswers.occasion === 'date') {
      matchedProductId = 'prod-dusky-rose';
    } else {
      matchedProductId = 'prod-adore';
    }

    const product = getProductById(matchedProductId) || PRODUCTS_DATA[0];

    const formWrap = document.getElementById('quizFormWrap');
    const resultWrap = document.getElementById('quizResultWrap');
    const matchImg = document.getElementById('matchImg');
    const matchTitle = document.getElementById('matchTitle');
    const matchFamily = document.getElementById('matchFamily');
    const matchDesc = document.getElementById('matchDesc');
    const matchPrice = document.getElementById('matchPrice');
    const matchAddBtn = document.getElementById('matchAddBtn');

    if (formWrap) formWrap.style.display = 'none';
    if (resultWrap) resultWrap.classList.add('active');

    if (matchImg) matchImg.src = product.image;
    if (matchTitle) matchTitle.textContent = product.name;
    if (matchFamily) matchFamily.textContent = `${product.scentFamily} • ${product.longevityHours}`;
    if (matchDesc) matchDesc.textContent = product.shortDesc;
    if (matchPrice) matchPrice.textContent = `₹${product.price.toLocaleString('en-IN')}`;

    if (matchAddBtn) {
      matchAddBtn.onclick = () => {
        Cart.addItem(product.id);
      };
    }
  }

  /* --------------------------------------------------------------------------
     4. FAQ ACCORDION
     -------------------------------------------------------------------------- */
  function initFAQ() {
    document.querySelectorAll('.faq-item').forEach(item => {
      const questionBtn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');

      if (questionBtn && answer) {
        questionBtn.addEventListener('click', () => {
          const isActive = item.classList.contains('active');

          // Close all
          document.querySelectorAll('.faq-item').forEach(other => {
            other.classList.remove('active');
            const otherAns = other.querySelector('.faq-answer');
            if (otherAns) otherAns.style.maxHeight = null;
          });

          // Toggle current
          if (!isActive) {
            item.classList.add('active');
            answer.style.maxHeight = answer.scrollHeight + 'px';
          }
        });
      }
    });
  }

  /* --------------------------------------------------------------------------
     5. NAVIGATION & MOBILE DRAWER
     -------------------------------------------------------------------------- */
  function initNavigation() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const overlay = document.getElementById('mobileNavOverlay');
    const closeBtn = document.getElementById('mobileNavClose');

    function openMobileNav() {
      if (mobileNav && overlay) {
        mobileNav.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    }

    function closeMobileNav() {
      if (mobileNav && overlay) {
        mobileNav.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openMobileNav);
    if (closeBtn) closeBtn.addEventListener('click', closeMobileNav);
    if (overlay) overlay.addEventListener('click', closeMobileNav);

    // Close on mobile nav link click
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });

    // Cart trigger buttons
    document.querySelectorAll('.cart-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Cart.openDrawer();
      });
    });
  }

  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    openQuickView,
    closeQuickView
  };
})();
