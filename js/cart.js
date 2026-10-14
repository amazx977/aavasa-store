/**
 * AAVASA / The Bold Rose Luxury Perfumes
 * Cart Management & Slide-Out Drawer Engine
 */

const Cart = (function () {
  const STORAGE_KEY = 'aavasa_perfume_cart';
  const COUPON_KEY = 'aavasa_perfume_coupon';
  const FREE_SHIPPING_THRESHOLD = 999;
  const STANDARD_SHIPPING_FEE = 99;

  // Available valid discount coupons
  const VALID_COUPONS = {
    'BOLD10': { type: 'percent', value: 0.10, desc: '10% Off Perfume Longevity Sale' },
    'AAVASA15': { type: 'percent', value: 0.15, desc: '15% Off VIP Member Discount' },
    'FREESHIP': { type: 'freeship', value: 0, desc: 'Free Express Delivery Across India' }
  };

  function getItems() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading cart from localStorage', e);
      return [];
    }
  }

  function saveItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      updateUI();
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items } }));
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }
  }

  function getActiveCoupon() {
    return localStorage.getItem(COUPON_KEY) || '';
  }

  function setActiveCoupon(code) {
    if (code) {
      localStorage.setItem(COUPON_KEY, code.toUpperCase().trim());
    } else {
      localStorage.removeItem(COUPON_KEY);
    }
    updateUI();
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: getItems() } }));
  }

  function addItem(productId, qty = 1) {
    const product = getProductById(productId);
    if (!product) return false;

    const items = getItems();
    const existingIndex = items.findIndex(item => item.id === productId);

    if (existingIndex > -1) {
      items[existingIndex].qty += qty;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        comparePrice: product.compareAtPrice,
        size: product.size,
        concentration: product.concentration,
        image: product.image,
        qty: qty
      });
    }

    saveItems(items);
    openDrawer();
    showToast(`Added "${product.name}" to your pre-order bag`, 'green');
    return true;
  }

  function updateQty(productId, delta) {
    let items = getItems();
    const index = items.findIndex(i => i.id === productId);
    if (index === -1) return;

    items[index].qty += delta;
    if (items[index].qty <= 0) {
      items.splice(index, 1);
      showToast('Item removed from pre-order bag');
    }
    saveItems(items);
  }

  function removeItem(productId) {
    let items = getItems();
    items = items.filter(i => i.id !== productId);
    saveItems(items);
    showToast('Item removed from pre-order bag');
  }

  function clearCart() {
    saveItems([]);
    setActiveCoupon('');
  }

  function getTotals() {
    const items = getItems();
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const activeCouponCode = getActiveCoupon();
    let discount = 0;
    let shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? STANDARD_SHIPPING_FEE : 0;

    if (activeCouponCode && VALID_COUPONS[activeCouponCode]) {
      const coupon = VALID_COUPONS[activeCouponCode];
      if (coupon.type === 'percent') {
        discount = Math.round(subtotal * coupon.value);
      } else if (coupon.type === 'freeship') {
        shipping = 0;
      }
    }

    const total = Math.max(0, subtotal - discount + shipping);
    const totalCount = items.reduce((sum, item) => sum + item.qty, 0);

    return {
      items,
      subtotal,
      discount,
      shipping,
      total,
      totalCount,
      activeCouponCode,
      freeShippingNeeded: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
    };
  }

  function applyCouponCode(code) {
    const cleanCode = (code || '').toUpperCase().trim();
    if (!cleanCode) {
      setActiveCoupon('');
      return { success: false, message: 'Please enter a coupon code.' };
    }

    if (VALID_COUPONS[cleanCode]) {
      setActiveCoupon(cleanCode);
      return { success: true, message: `Coupon ${cleanCode} applied! ${VALID_COUPONS[cleanCode].desc}` };
    } else {
      return { success: false, message: 'Invalid coupon code. Try BOLD10 or FREESHIP' };
    }
  }

  function openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (drawer && overlay) {
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (drawer && overlay) {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function updateUI() {
    const totals = getTotals();

    // Update cart badge counts
    const badgeElements = document.querySelectorAll('.cart-counter');
    badgeElements.forEach(el => {
      el.textContent = totals.totalCount;
      el.style.transform = 'scale(1.25)';
      setTimeout(() => el.style.transform = 'scale(1)', 200);
    });

    // Update Drawer Elements if present
    const cartItemsBody = document.getElementById('cartItemsList');
    if (!cartItemsBody) return;

    if (totals.items.length === 0) {
      cartItemsBody.innerHTML = `
        <div class="cart-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <h4 class="font-serif">Your pre-order bag is empty</h4>
          <p class="text-muted fs-sm">Explore our 6+ hour lab-tested fragrances.</p>
          <button class="btn btn-primary btn-sm" data-action="shop-perfumes">Pre-Order Perfumes</button>
        </div>
      `;
    } else {
      cartItemsBody.innerHTML = totals.items.map(item => `
        <div class="cart-item-row" data-id="${item.id}">
          <div class="cart-item-img">
            <img src="${item.image}" alt="${item.name}" loading="lazy">
          </div>
          <div class="cart-item-details">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="cart-item-title">${item.name}</span>
              <button class="cart-item-remove" data-action="cart-remove" data-id="${item.id}" title="Remove">✕</button>
            </div>
            <span class="cart-item-size">${item.size} • ${item.concentration.split(' ')[0]}</span>
            <div class="cart-item-pricing">
              <div class="cart-qty-ctrl">
                <button class="qty-btn" data-action="cart-qty" data-delta="-1" data-id="${item.id}">−</button>
                <span class="qty-display">${item.qty}</span>
                <button class="qty-btn" data-action="cart-qty" data-delta="1" data-id="${item.id}">+</button>
              </div>
              <span class="cart-item-price">₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Free shipping meter
    const goalText = document.getElementById('cartGoalText');
    const goalFill = document.getElementById('cartGoalFill');
    if (goalText && goalFill) {
      if (totals.subtotal >= FREE_SHIPPING_THRESHOLD) {
        goalText.innerHTML = `🎉 <strong>Congratulations!</strong> You unlocked Free Express Shipping!`;
        goalFill.style.width = '100%';
      } else {
        const percent = Math.min(100, Math.round((totals.subtotal / FREE_SHIPPING_THRESHOLD) * 100));
        goalText.innerHTML = `Add <strong>₹${totals.freeShippingNeeded}</strong> more for <strong>Free Express Delivery</strong>`;
        goalFill.style.width = `${percent}%`;
      }
    }

    // Subtotal and Grand Total
    const subtotalEl = document.getElementById('cartSubtotal');
    const discountEl = document.getElementById('cartDiscount');
    const discountRow = document.getElementById('cartDiscountRow');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl = document.getElementById('cartGrandTotal');

    if (subtotalEl) subtotalEl.textContent = `₹${totals.subtotal.toLocaleString('en-IN')}`;
    if (shippingEl) shippingEl.textContent = totals.shipping === 0 ? 'FREE' : `₹${totals.shipping}`;
    if (discountEl && discountRow) {
      if (totals.discount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `-₹${totals.discount.toLocaleString('en-IN')}`;
      } else {
        discountRow.style.display = 'none';
      }
    }
    if (totalEl) totalEl.textContent = `₹${totals.total.toLocaleString('en-IN')}`;

    // Checkout button state
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (checkoutBtn) {
      checkoutBtn.disabled = totals.items.length === 0;
      checkoutBtn.style.opacity = totals.items.length === 0 ? '0.5' : '1';
    }
  }

  // Toast notification system
  function showToast(message, type = 'orange') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'green' ? 'toast-green' : ''}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Initial event attachments
  document.addEventListener('DOMContentLoaded', () => {
    updateUI();

    const overlay = document.getElementById('cartDrawerOverlay');
    if (overlay) {
      overlay.addEventListener('click', closeDrawer);
    }

    const closeBtn = document.getElementById('cartCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDrawer);
    }

    const couponBtn = document.getElementById('applyCouponBtn');
    const couponInput = document.getElementById('cartCouponInput');
    if (couponBtn && couponInput) {
      couponBtn.addEventListener('click', () => {
        const res = applyCouponCode(couponInput.value);
        showToast(res.message, res.success ? 'green' : 'orange');
        couponInput.value = '';
      });
    }

    const cartItemsBody = document.getElementById('cartItemsList');
    if (cartItemsBody) {
      cartItemsBody.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-action="cart-remove"]');
        if (removeBtn) {
          removeItem(removeBtn.dataset.id);
          return;
        }

        const qtyBtn = e.target.closest('[data-action="cart-qty"]');
        if (qtyBtn) {
          const delta = parseInt(qtyBtn.dataset.delta, 10);
          updateQty(qtyBtn.dataset.id, delta);
          return;
        }

        const shopBtn = e.target.closest('[data-action="shop-perfumes"]');
        if (shopBtn) {
          closeDrawer();
          const target = document.getElementById('fragrances');
          if (target) target.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      });
    }

    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const totals = getTotals();
        if (totals.items.length === 0) {
          showToast('Your pre-order bag is empty! Please select a perfume first.');
          return;
        }
        closeDrawer();
        window.location.href = 'checkout.html';
      });
    }
  });

  return {
    getItems,
    addItem,
    updateQty,
    removeItem,
    clearCart,
    getTotals,
    applyCouponCode,
    openDrawer,
    closeDrawer,
    showToast,
    updateUI
  };
})();
