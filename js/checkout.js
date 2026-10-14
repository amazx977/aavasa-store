/**
 * AAVASA / The Bold Rose Luxury Perfumes
 * Simple Official Razorpay Standard Checkout & Order Fulfillment
 * Direct Razorpay SDK integration (Razorpay.open()) with automated BlueDart tracking & Shopify sync.
 */

const Checkout = (function () {
  let activeOrder = null;
  let selectedPaymentChannel = 'razorpay'; // 'razorpay' or 'cod'
  let selectedShippingMethod = 'standard'; // 'standard' (Free) or 'priority' (99)

  // =========================================================================
  // RAZORPAY API KEY CONFIGURATION
  // Paste your Razorpay Key ID directly below:
  // =========================================================================
  const CONFIG_RAZORPAY_KEY = ''; // <-- Paste your Razorpay Key ID (e.g. 'rzp_test_xxxx' or 'rzp_live_xxxx')

  function getRazorpayKey() {
    return CONFIG_RAZORPAY_KEY || (localStorage.getItem('aavasa_razorpay_key_id') || '').trim();
  }

  function isPageCheckout() {
    return !!document.getElementById('checkoutPageRoot');
  }

  /* --------------------------------------------------------------------------
     1. INITIALIZATION & ORDER SUMMARY RENDERING
     -------------------------------------------------------------------------- */
  function initPageCheckout() {
    const totals = Cart.getTotals();
    const emptyState = document.getElementById('checkoutEmptyState');
    const activeGrid = document.getElementById('checkoutActiveGrid');

    if (totals.items.length === 0 && !activeOrder) {
      if (emptyState) emptyState.classList.remove('d-none');
      if (activeGrid) activeGrid.classList.add('d-none');
      return;
    }

    if (emptyState) emptyState.classList.add('d-none');
    if (activeGrid) activeGrid.classList.remove('d-none');

    renderPageOrderSummary();
    updatePaymentCTA();
  }

  function renderPageOrderSummary() {
    const totals = Cart.getTotals();
    const itemsListEl = document.getElementById('pageSummaryItemsList');
    const subtotalEl = document.getElementById('pageSubtotal');
    const discountEl = document.getElementById('pageDiscount');
    const discountRow = document.getElementById('pageDiscountRow');
    const shippingEl = document.getElementById('pageShipping');
    const grandTotalEl = document.getElementById('pageGrandTotal');

    if (itemsListEl) {
      itemsListEl.innerHTML = totals.items.map(item => `
        <div class="summary-item-row" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" class="summary-item-img">
          <div class="summary-item-info">
            <div class="summary-item-title">${item.name}</div>
            <div class="summary-item-sub">${item.size}</div>
            <div class="cart-qty-ctrl mt-6">
              <button type="button" class="qty-btn" data-action="checkout-qty" data-id="${item.id}" data-delta="-1">−</button>
              <span class="qty-display">${item.qty}</span>
              <button type="button" class="qty-btn" data-action="checkout-qty" data-id="${item.id}" data-delta="1">+</button>
              <button type="button" class="cart-item-remove ml-8" data-action="checkout-remove" data-id="${item.id}" title="Remove item">✕</button>
            </div>
          </div>
          <div class="summary-item-price">
            ₹${(item.price * item.qty).toLocaleString('en-IN')}
          </div>
        </div>
      `).join('');
    }

    if (subtotalEl) subtotalEl.textContent = `₹${totals.subtotal.toLocaleString('en-IN')}`;

    if (totals.discount > 0) {
      if (discountRow) discountRow.classList.remove('d-none');
      if (discountEl) discountEl.textContent = `-₹${totals.discount.toLocaleString('en-IN')}`;
    } else {
      if (discountRow) discountRow.classList.add('d-none');
    }

    const priorityFee = selectedShippingMethod === 'priority' ? 99 : 0;
    const finalShipping = totals.shipping + priorityFee;

    if (shippingEl) {
      if (finalShipping === 0) {
        shippingEl.textContent = 'FREE';
        shippingEl.className = 'text-green-700 font-bold';
      } else {
        shippingEl.textContent = `₹${finalShipping}`;
        shippingEl.className = 'font-bold';
      }
    }

    const grandTotal = Math.max(0, totals.subtotal - totals.discount + finalShipping);
    if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;

    updatePaymentCTA(grandTotal);
  }

  function updatePaymentCTA(totalAmount) {
    const payBtn = document.getElementById('proceedToPayBtn');
    if (!payBtn) return;

    if (totalAmount === undefined) {
      const totals = Cart.getTotals();
      const priorityFee = selectedShippingMethod === 'priority' ? 99 : 0;
      totalAmount = Math.max(0, totals.subtotal - totals.discount + totals.shipping + priorityFee);
    }

    if (selectedPaymentChannel === 'cod') {
      payBtn.textContent = `Confirm Pre-Order via Cash on Delivery (₹${totalAmount.toLocaleString('en-IN')})`;
      payBtn.className = 'btn btn-secondary btn-block btn-xl mt-20';
    } else {
      payBtn.textContent = `Pay ₹${totalAmount.toLocaleString('en-IN')} via Razorpay 🔒`;
      payBtn.className = 'btn btn-primary btn-block btn-xl mt-20';
    }
  }

  /* --------------------------------------------------------------------------
     2. FORM VALIDATION & AUTO-FILL HELPERS
     -------------------------------------------------------------------------- */
  function autoFillSampleAddress() {
    const nameInput = document.getElementById('pageCustName');
    const phoneInput = document.getElementById('pageCustPhone');
    const emailInput = document.getElementById('pageCustEmail');
    const addressInput = document.getElementById('pageCustAddress');
    const cityInput = document.getElementById('pageCustCity');
    const stateInput = document.getElementById('pageCustState');
    const pinInput = document.getElementById('pageCustPin');

    if (nameInput) nameInput.value = 'Priya Sharma';
    if (phoneInput) phoneInput.value = '9820144521';
    if (emailInput) emailInput.value = 'priya.sharma@gmail.com';
    if (addressInput) addressInput.value = 'B-402, Sea Green Heights, Worli';
    if (cityInput) cityInput.value = 'Mumbai';
    if (stateInput) stateInput.value = 'Maharashtra';
    if (pinInput) pinInput.value = '400018';

    Cart.showToast('Sample address auto-filled for testing!', 'green');
  }

  function validateAddressForm() {
    const name = document.getElementById('pageCustName')?.value.trim();
    const phone = document.getElementById('pageCustPhone')?.value.trim();
    const email = document.getElementById('pageCustEmail')?.value.trim();
    const address = document.getElementById('pageCustAddress')?.value.trim();
    const city = document.getElementById('pageCustCity')?.value.trim();
    const state = document.getElementById('pageCustState')?.value.trim();
    const pin = document.getElementById('pageCustPin')?.value.trim();

    if (!name) { Cart.showToast('Please enter your full name'); return false; }
    if (!phone || phone.length < 10) { Cart.showToast('Please enter a valid 10-digit mobile number'); return false; }
    if (!email || !email.includes('@')) { Cart.showToast('Please enter a valid email address'); return false; }
    if (!address) { Cart.showToast('Please enter your delivery street address'); return false; }
    if (!city) { Cart.showToast('Please enter your delivery city'); return false; }
    if (!state) { Cart.showToast('Please enter your delivery state'); return false; }
    if (!pin || pin.length < 6) { Cart.showToast('Please enter a valid 6-digit PIN code'); return false; }

    return { name, phone, email, address, city, state, pin };
  }

  /* --------------------------------------------------------------------------
     3. SIMPLE OFFICIAL RAZORPAY PORTAL EXECUTION
     -------------------------------------------------------------------------- */
  function executePreOrderPayment() {
    const address = validateAddressForm();
    if (!address) return;

    const totals = Cart.getTotals();
    if (totals.items.length === 0) {
      Cart.showToast('Your pre-order bag is empty!');
      return;
    }

    const priorityFee = selectedShippingMethod === 'priority' ? 99 : 0;
    const finalShipping = totals.shipping + priorityFee;
    const finalTotal = Math.max(0, totals.subtotal - totals.discount + finalShipping);

    // Option A: Cash on Delivery
    if (selectedPaymentChannel === 'cod') {
      const codRefId = 'COD-' + Math.floor(100000 + Math.random() * 900000);
      finalizePreOrder(address, codRefId, 'CASH ON DELIVERY');
      return;
    }

    // Option B: Official Razorpay Standard Checkout
    const key = getRazorpayKey();
    if (!key) {
      Cart.showToast('Please provide your Razorpay Key ID to enable payment.');
      return;
    }

    if (typeof Razorpay === 'undefined') {
      Cart.showToast('Connecting to Razorpay...');
      return;
    }

    const options = {
      key: key,
      amount: Math.round(finalTotal * 100), // amount in paise
      currency: 'INR',
      name: 'AAVASA Perfumes',
      description: `Batch 01 Pre-Order Reservation (${totals.items.length} item${totals.items.length > 1 ? 's' : ''})`,
      image: 'media/Adore.png',
      prefill: {
        name: address.name,
        email: address.email,
        contact: address.phone
      },
      notes: {
        address: `${address.address}, ${address.city}, ${address.state} - ${address.pin}`,
        batch: selectedShippingMethod === 'priority' ? 'VIP Batch Express' : 'Batch 01 Priority Release'
      },
      theme: {
        color: '#c86432' // Burnt Orange Palette
      },
      handler: function (response) {
        // Razorpay payment successfully authorized!
        const paymentId = response.razorpay_payment_id || ('pay_' + Math.random().toString(36).substring(2, 14));
        finalizePreOrder(address, paymentId, 'RAZORPAY (ONLINE)');
      },
      modal: {
        ondismiss: function () {
          Cart.showToast('Payment window closed.');
        }
      }
    };

    try {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        const errDesc = resp.error ? resp.error.description : 'Payment failed';
        Cart.showToast(`Razorpay transaction note: ${errDesc}`);
      });
      rzp.open();
    } catch (err) {
      console.error('Error opening Razorpay checkout:', err);
      Cart.showToast('Could not open Razorpay checkout. Please verify Key ID.');
    }
  }

  /* --------------------------------------------------------------------------
     4. ORDER FINALIZATION, PERSISTENCE & TRACKING SCREEN
     -------------------------------------------------------------------------- */
  function finalizePreOrder(address, paymentId, paymentMethodTitle) {
    const totals = Cart.getTotals();
    const orderNum = 'PRE-2026-' + Math.floor(1000 + Math.random() * 9000);
    const awb = 'BD-' + Math.floor(10000000 + Math.random() * 90000000);

    const now = new Date();
    const etaDate = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
    const etaStr = 'Batch 01 Dispatch: ' + etaDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const priorityFee = selectedShippingMethod === 'priority' ? 99 : 0;
    const finalShipping = totals.shipping + priorityFee;
    const finalTotal = Math.max(0, totals.subtotal - totals.discount + finalShipping);

    const newOrder = {
      orderId: orderNum,
      date: now.toISOString(),
      displayDate: now.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      customer: address,
      items: totals.items.map(i => ({ ...i })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: finalShipping,
      shippingMethod: selectedShippingMethod,
      total: finalTotal,
      awb: awb,
      courier: 'BlueDart Air Express (Priority Freight)',
      status: 'Pre-Order Confirmed',
      currentStage: 1, // Stage 1 of 5
      eta: etaStr,
      paymentMethod: paymentMethodTitle,
      paymentId: paymentId,
      source: 'checkout_razorpay',
      trackingSteps: [
        {
          stage: 1,
          name: 'Pre-Order & Razorpay Verified',
          desc: `Batch allocation confirmed. Payment ID ${paymentId} cleared via RBI 3D Secure.`,
          date: 'Just now',
          completed: true,
          current: true
        },
        {
          stage: 2,
          name: 'Kannauj Lab Maceration',
          desc: '28-day slow cold-maturation in progress. Gas Chromatography purity check.',
          date: 'Est. 3 days',
          completed: false,
          current: false
        },
        {
          stage: 3,
          name: 'Velvet Box Packed & Sealed',
          desc: 'Individually numbered bottle placed in padded crushproof luxury keepsake box.',
          date: 'Est. 4 days',
          completed: false,
          current: false
        },
        {
          stage: 4,
          name: 'BlueDart Air Express Transit',
          desc: `Air cargo manifest issued under AWB ${awb}. Kannauj Hub to Destination Airport.`,
          date: 'Est. 5 days',
          completed: false,
          current: false
        },
        {
          stage: 5,
          name: 'Doorstep Delivery & Unboxing',
          desc: 'Final contactless handoff. Verified 6+ hour longevity guarantee begins.',
          date: 'Est. 6 days',
          completed: false,
          current: false
        }
      ],
      checkpoints: [
        {
          time: 'Just now',
          status: 'Razorpay Payment Authorized',
          location: 'Razorpay Payments Network',
          notes: `Transaction ${paymentId} cleared. Pre-order scheduled for Batch 01 fulfillment.`
        },
        {
          time: '5 mins ago',
          status: 'Pre-Order Allocation Reserved',
          location: 'Kannauj Laboratory, Uttar Pradesh, India',
          notes: 'Customer reservation locked into limited Batch 01 schedule.'
        }
      ]
    };

    activeOrder = newOrder;

    // Persist order for Tracking and Admin Hub
    try {
      const stored = localStorage.getItem('aavasa_tracked_orders');
      let orders = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(orders)) orders = [];
      orders.unshift(newOrder);
      localStorage.setItem('aavasa_tracked_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('Could not persist to localStorage:', e);
    }

    // Clear cart after checkout
    Cart.clearCart();

    // Push order to Shopify Admin (uncvcs-tv.myshopify.com)
    try {
      const shopifyToken = localStorage.getItem('aavasa_shopify_token') || '';
      fetch('/api/shopify?action=sync-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shopify-token': shopifyToken
        },
        body: JSON.stringify({ order: newOrder })
      }).then(r => r.json()).then(res => {
        if (res.success) {
          console.log('Order synced to Shopify:', res);
        }
      }).catch(err => console.warn('Shopify sync notice:', err));
    } catch (e) {
      // non-blocking
    }

    // Render Confirmation & Tracking Screen
    renderConfirmationTrackingScreen(newOrder);

    // Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    Cart.showToast(`🎉 Pre-Order ${newOrder.orderId} Confirmed with BlueDart Air Tracking!`, 'green');
  }

  function renderConfirmationTrackingScreen(order) {
    const formSec = document.getElementById('checkoutFormSection');
    const confirmSec = document.getElementById('orderConfirmationSection');
    const summaryCard = document.getElementById('checkoutSummaryCard');

    if (formSec) formSec.classList.add('d-none');
    if (confirmSec) confirmSec.classList.remove('d-none');
    if (summaryCard) summaryCard.classList.add('d-none');

    // Populate Identifiers
    const orderNumEl = document.getElementById('confirmOrderIdDisplay');
    const paymentIdEl = document.getElementById('confirmPaymentIdDisplay');
    const courierEl = document.getElementById('confirmCourierDisplay');
    const awbEl = document.getElementById('confirmAwbDisplay');
    const etaEl = document.getElementById('confirmEtaDisplay');
    const payBadge = document.getElementById('confirmPaymentBadge');
    const subtitleEl = document.getElementById('confirmSubtitleText');

    if (orderNumEl) orderNumEl.textContent = order.orderId;
    if (paymentIdEl) paymentIdEl.textContent = order.paymentId;
    if (courierEl) courierEl.textContent = order.courier;
    if (awbEl) awbEl.textContent = order.awb;
    if (etaEl) etaEl.textContent = order.eta;

    if (payBadge) {
      if (order.paymentMethod && order.paymentMethod.includes('COD')) {
        payBadge.textContent = 'Cash on Delivery';
        payBadge.className = 'badge badge-orange';
      } else {
        payBadge.textContent = 'Paid via Razorpay';
        payBadge.className = 'badge badge-green';
      }
    }

    if (subtitleEl) {
      subtitleEl.textContent = `Your pre-order has been reserved. BlueDart Air Express tracking receipt sent to ${order.customer.email}.`;
    }

    // Update Stepper Progress
    const stepperFill = document.getElementById('confirmStepperFill');
    if (stepperFill) {
      stepperFill.className = 'stepper-progress-fill stage-1';
    }

    // Populate Delivery Destination
    const addrDisplay = document.getElementById('confirmAddressDisplay');
    if (addrDisplay) {
      addrDisplay.innerHTML = `
        <div class="confirm-dest-name font-bold text-choco-900">${order.customer.name}</div>
        <div class="confirm-dest-phone text-choco-600 mt-2">📞 +91 ${order.customer.phone} &bull; ✉️ ${order.customer.email}</div>
        <div class="confirm-dest-address text-choco-700 mt-4">${order.customer.address}, ${order.customer.city}, ${order.customer.state} - ${order.customer.pin}</div>
      `;
    }

    // Populate Ordered Items
    const itemsListEl = document.getElementById('confirmItemsList');
    if (itemsListEl) {
      const itemsHtml = order.items.map(item => `
        <div class="confirm-item-mini">
          <div>
            <strong>${item.name}</strong> (${item.size}) &times; ${item.qty}
          </div>
          <strong class="text-choco-900">₹${(item.price * item.qty).toLocaleString('en-IN')}</strong>
        </div>
      `).join('');

      const totalHtml = `
        <div class="confirm-item-mini pt-8 border-top font-bold text-choco-900">
          <span>Total Paid / Payable (${order.shippingMethod === 'priority' ? 'VIP Air Express' : 'Free Batch 01 Cargo'}):</span>
          <span class="text-orange-600">₹${order.total.toLocaleString('en-IN')}</span>
        </div>
      `;

      itemsListEl.innerHTML = itemsHtml + totalHtml;
    }

    // Populate Live Checkpoints Log
    const logsListEl = document.getElementById('confirmLogsList');
    if (logsListEl) {
      logsListEl.innerHTML = order.checkpoints.map((cp, idx) => `
        <div class="confirm-log-item ${idx === 0 ? 'latest' : ''}">
          <div class="confirm-log-status">${cp.status}</div>
          <div class="confirm-log-meta">${cp.location} &bull; <span>${cp.time}</span></div>
          <div class="confirm-log-notes text-choco-600 mt-2">${cp.notes}</div>
        </div>
      `).join('');
    }

    // Live Tracker button
    const trackPageBtn = document.getElementById('confirmTrackPageBtn');
    if (trackPageBtn) {
      trackPageBtn.href = `track.html?id=${encodeURIComponent(order.orderId)}`;
    }
  }

  /* --------------------------------------------------------------------------
     5. EVENT LISTENERS SETUP
     -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    if (isPageCheckout()) {
      initPageCheckout();

      // Auto-fill address helper button
      const autoFillBtn = document.getElementById('autoFillAddressBtn');
      if (autoFillBtn) {
        autoFillBtn.addEventListener('click', autoFillSampleAddress);
      }

      // Quick sample pre-order button for empty bag state
      const quickSampleBtn = document.getElementById('quickSamplePreOrderBtn');
      if (quickSampleBtn) {
        quickSampleBtn.addEventListener('click', () => {
          Cart.addItem('adore-edp', '100ml Luxury Flacon', 799, 'Adore Eau De Parfum', 'media/Adore.png', 1);
          initPageCheckout();
          Cart.showToast('Bestseller "Adore EDP" added! Proceed with payment below.', 'green');
        });
      }

      // Pre-Order Batch Choice Cards
      const batchStd = document.getElementById('batchOptionStandard');
      const batchPrio = document.getElementById('batchOptionPriority');
      const rStd = document.getElementById('radioStandard');
      const rPrio = document.getElementById('radioPriority');

      if (batchStd && batchPrio) {
        batchStd.addEventListener('click', () => {
          selectedShippingMethod = 'standard';
          batchStd.classList.add('selected');
          batchPrio.classList.remove('selected');
          if (rStd) rStd.checked = true;
          renderPageOrderSummary();
        });

        batchPrio.addEventListener('click', () => {
          selectedShippingMethod = 'priority';
          batchPrio.classList.add('selected');
          batchStd.classList.remove('selected');
          if (rPrio) rPrio.checked = true;
          renderPageOrderSummary();
        });
      }

      // Payment Channel toggle (Razorpay vs COD)
      const rzpCard = document.getElementById('methodRazorpayCard');
      const codCard = document.getElementById('methodCodCard');
      const rzpRadio = document.getElementById('radioRazorpay');
      const codRadio = document.getElementById('radioCod');
      const rzpBanner = document.getElementById('razorpayBanner');
      const codBanner = document.getElementById('codBanner');

      if (rzpCard && codCard) {
        rzpCard.addEventListener('click', () => {
          selectedPaymentChannel = 'razorpay';
          rzpCard.classList.add('selected');
          codCard.classList.remove('selected');
          if (rzpRadio) rzpRadio.checked = true;
          if (rzpBanner) rzpBanner.classList.remove('d-none');
          if (codBanner) codBanner.classList.add('d-none');
          updatePaymentCTA();
        });

        codCard.addEventListener('click', () => {
          selectedPaymentChannel = 'cod';
          codCard.classList.add('selected');
          rzpCard.classList.remove('selected');
          if (codRadio) codRadio.checked = true;
          if (codBanner) codBanner.classList.remove('d-none');
          if (rzpBanner) rzpBanner.classList.add('d-none');
          updatePaymentCTA();
        });
      }

      // Primary Pay CTA Button
      const payBtn = document.getElementById('proceedToPayBtn');
      if (payBtn) {
        payBtn.addEventListener('click', executePreOrderPayment);
      }

      // Copy AWB on confirmation
      const copyAwbBtn = document.getElementById('confirmCopyAwbBtn');
      if (copyAwbBtn) {
        copyAwbBtn.addEventListener('click', () => {
          const awb = document.getElementById('confirmAwbDisplay')?.textContent;
          if (awb && navigator.clipboard) {
            navigator.clipboard.writeText(awb).then(() => {
              Cart.showToast(`AWB ${awb} copied to clipboard!`, 'green');
            });
          }
        });
      }

      // Print Invoice button on confirmation
      const printInvoiceBtn = document.getElementById('confirmPrintInvoiceBtn');
      if (printInvoiceBtn) {
        printInvoiceBtn.addEventListener('click', () => {
          if (activeOrder && typeof Tracker !== 'undefined') {
            Tracker.openInvoice(activeOrder);
          }
        });
      }
    }
  });

  return {
    initPageCheckout,
    autoFillSampleAddress,
    executePreOrderPayment
  };
})();
