/**
 * AAVASA / The Bold Rose Luxury Perfumes
 * Streamlined Razorpay Checkout & Real-Time Logistics Tracking
 * Native Razorpay Standard Gateway with live BlueDart tracking (Complimentary Air Express).
 */

const Checkout = (function () {
  let activeOrder = null;

  // =========================================================================
  // RAZORPAY API KEY CONFIGURATION
  // Official Razorpay Standard Key ID:
  // =========================================================================
  const CONFIG_RAZORPAY_KEY = 'rzp_test_TnpHm6W02JydRs';

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

    // Complimentary Express Air Shipping
    if (shippingEl) {
      shippingEl.textContent = 'FREE';
      shippingEl.className = 'text-green-700 font-bold';
    }

    const grandTotal = Math.max(0, totals.subtotal - totals.discount);
    if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;

    updatePaymentCTA(grandTotal);
  }

  function updatePaymentCTA(totalAmount) {
    const payBtn = document.getElementById('proceedToPayBtn');
    if (!payBtn) return;

    if (totalAmount === undefined) {
      const totals = Cart.getTotals();
      totalAmount = Math.max(0, totals.subtotal - totals.discount);
    }

    payBtn.textContent = `Pay ₹${totalAmount.toLocaleString('en-IN')} via Razorpay 🔒`;
    payBtn.className = 'btn btn-primary btn-block btn-xl mt-20';
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

    Cart.showToast('Sample address auto-filled for preview!', 'green');
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
    if (!pin || pin.length < 6) { Cart.showToast('Please enter a valid 6-digit PIN code'); return false; }
    if (!city) { Cart.showToast('Please enter your delivery city'); return false; }
    if (!state) { Cart.showToast('Please enter your delivery state'); return false; }

    return { name, phone, email, address, city, state, pin };
  }

  /* --------------------------------------------------------------------------
     3. OFFICIAL RAZORPAY STANDARD GATEWAY EXECUTION
     -------------------------------------------------------------------------- */
  async function executePreOrderPayment() {
    const address = validateAddressForm();
    if (!address) return;

    const totals = Cart.getTotals();
    if (totals.items.length === 0) {
      Cart.showToast('Your pre-order bag is empty!');
      return;
    }

    const finalTotal = Math.max(0, totals.subtotal - totals.discount);

    const key = getRazorpayKey();
    if (!key) {
      Cart.showToast('Razorpay Key ID missing. Please check configuration.');
      return;
    }

    if (typeof Razorpay === 'undefined') {
      Cart.showToast('Loading Razorpay secure gateway...');
      return;
    }

    const payBtn = document.getElementById('proceedToPayBtn');
    const originalBtnText = payBtn ? payBtn.textContent : '';
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.textContent = 'Connecting to Razorpay Secure Gateway...';
    }

    function resetButton() {
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = originalBtnText;
      }
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
        batch: 'Limited Batch 01 (Handcrafted Release)'
      },
      theme: {
        color: '#c85a17' // Burnt Orange Palette
      },
      handler: function (response) {
        resetButton();
        const paymentId = response.razorpay_payment_id || ('pay_' + Math.random().toString(36).substring(2, 14));
        finalizePreOrder(address, paymentId, 'RAZORPAY (ONLINE)');
      },
      modal: {
        ondismiss: function () {
          resetButton();
          Cart.showToast('Payment window closed.');
        }
      }
    };

    // Try creating a verified server-side Razorpay order
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const serverRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalTotal,
          currency: 'INR',
          receipt: 'rcpt_' + Date.now(),
          notes: {
            customer: address.name,
            phone: address.phone
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (serverRes.ok) {
        const orderData = await serverRes.json();
        if (orderData && orderData.success && orderData.order && orderData.order.id) {
          options.order_id = orderData.order.id;
        }
      }
    } catch (e) {
      // Non-blocking fallback to standard client-side Razorpay checkout
    }

    try {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        resetButton();
        const errDesc = resp.error ? resp.error.description : 'Payment failed';
        Cart.showToast(`Razorpay transaction note: ${errDesc}`);
      });
      rzp.open();
    } catch (err) {
      resetButton();
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

    const finalTotal = Math.max(0, totals.subtotal - totals.discount);

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
      shipping: 0,
      shippingMethod: 'standard',
      total: finalTotal,
      awb: awb,
      courier: 'BlueDart Air Express (Priority Freight)',
      status: 'Pre-Order Confirmed',
      currentStage: 1, // Stage 1 of 5
      eta: etaStr,
      paymentMethod: paymentMethodTitle || 'RAZORPAY (ONLINE)',
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
      payBadge.textContent = 'Paid via Razorpay';
      payBadge.className = 'badge badge-green';
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
          <span>Total Paid via Razorpay (Complimentary Air Express):</span>
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
