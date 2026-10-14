/**
 * AAVASA / The Bold Rose Luxury Perfumes
 * Fully Functional Payment Portal & Checkout Engine
 */

const Checkout = (function () {
  let currentStep = 1;
  let selectedPaymentMethod = 'upi';
  let activeOrder = null;

  function open() {
    const totals = Cart.getTotals();
    if (totals.items.length === 0) {
      Cart.showToast('Your bag is empty! Please add a perfume first.');
      return;
    }

    const modal = document.getElementById('checkoutModal');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      setStep(1);
      renderOrderSummary();
    }
  }

  function close() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      resetForm();
    }
  }

  function setStep(step) {
    currentStep = step;

    // Update step tabs UI
    document.querySelectorAll('.step-item').forEach((el, idx) => {
      const stepNum = idx + 1;
      el.classList.remove('active', 'completed');
      if (stepNum === currentStep) {
        el.classList.add('active');
      } else if (stepNum < currentStep) {
        el.classList.add('completed');
      }
    });

    // Toggle step sections
    const step1Sec = document.getElementById('checkoutStep1');
    const step2Sec = document.getElementById('checkoutStep2');
    const step3Sec = document.getElementById('checkoutStep3');

    if (step1Sec) step1Sec.style.display = step === 1 ? 'block' : 'none';
    if (step2Sec) step2Sec.style.display = step === 2 ? 'block' : 'none';
    if (step3Sec) step3Sec.style.display = step === 3 ? 'block' : 'none';

    // Reset processing / success overlays if any
    const processingEl = document.getElementById('paymentProcessingOverlay');
    const successEl = document.getElementById('orderSuccessScreen');
    if (processingEl) processingEl.classList.remove('active');
    if (successEl) successEl.classList.remove('active');
  }

  function renderOrderSummary() {
    const totals = Cart.getTotals();
    const miniList = document.getElementById('checkoutMiniList');
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const discountEl = document.getElementById('checkoutDiscount');
    const discountRow = document.getElementById('checkoutDiscountRow');
    const shippingEl = document.getElementById('checkoutShipping');
    const grandTotalEl = document.getElementById('checkoutGrandTotal');
    const upiAmountEl = document.getElementById('upiAmountDisplay');

    if (miniList) {
      miniList.innerHTML = totals.items.map(item => `
        <div class="mini-item">
          <img src="${item.image}" alt="${item.name}">
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--c-choco-800);">${item.name}</div>
            <div style="font-size: 0.76rem; color: var(--c-choco-500);">${item.size} • Qty: ${item.qty}</div>
          </div>
          <div style="font-weight: 700;">₹${(item.price * item.qty).toLocaleString('en-IN')}</div>
        </div>
      `).join('');
    }

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
    if (grandTotalEl) grandTotalEl.textContent = `₹${totals.total.toLocaleString('en-IN')}`;
    if (upiAmountEl) upiAmountEl.textContent = `₹${totals.total.toLocaleString('en-IN')}`;
  }

  function validateAddressForm() {
    const name = document.getElementById('custName')?.value.trim();
    const phone = document.getElementById('custPhone')?.value.trim();
    const email = document.getElementById('custEmail')?.value.trim();
    const address = document.getElementById('custAddress')?.value.trim();
    const city = document.getElementById('custCity')?.value.trim();
    const state = document.getElementById('custState')?.value.trim();
    const pin = document.getElementById('custPin')?.value.trim();

    if (!name) { Cart.showToast('Please enter your full name'); return false; }
    if (!phone || phone.length < 10) { Cart.showToast('Please enter a valid 10-digit mobile number'); return false; }
    if (!email || !email.includes('@')) { Cart.showToast('Please enter a valid email address'); return false; }
    if (!address) { Cart.showToast('Please enter your delivery street address'); return false; }
    if (!city) { Cart.showToast('Please enter your city'); return false; }
    if (!state) { Cart.showToast('Please enter your state'); return false; }
    if (!pin || pin.length < 6) { Cart.showToast('Please enter a valid 6-digit PIN code'); return false; }

    return {
      name, phone, email, address, city, state, pin
    };
  }

  function setPaymentMethod(method) {
    selectedPaymentMethod = method;

    // Toggle active tab buttons
    document.querySelectorAll('.payment-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.method === method);
    });

    // Toggle panels
    const upiPanel = document.getElementById('upiPanel');
    const cardPanel = document.getElementById('cardPanel');
    const netbankingPanel = document.getElementById('netbankingPanel');
    const codPanel = document.getElementById('codPanel');

    if (upiPanel) upiPanel.style.display = method === 'upi' ? 'block' : 'none';
    if (cardPanel) cardPanel.style.display = method === 'card' ? 'block' : 'none';
    if (netbankingPanel) netbankingPanel.style.display = method === 'netbanking' ? 'block' : 'none';
    if (codPanel) codPanel.style.display = method === 'cod' ? 'block' : 'none';
  }

  function formatCardNumber(input) {
    let val = input.value.replace(/\D/g, '').slice(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    input.value = formatted;

    const displayNum = document.getElementById('mockCardNumber');
    if (displayNum) {
      displayNum.textContent = formatted || '•••• •••• •••• ••••';
    }

    // Detect card brand
    const brandDisplay = document.getElementById('mockCardBrand');
    if (brandDisplay) {
      if (val.startsWith('4')) brandDisplay.textContent = 'VISA';
      else if (val.startsWith('5')) brandDisplay.textContent = 'MASTERCARD';
      else if (val.startsWith('6')) brandDisplay.textContent = 'RUPAY';
      else if (val.startsWith('3')) brandDisplay.textContent = 'AMEX';
      else brandDisplay.textContent = 'CARD';
    }
  }

  function formatExpiry(input) {
    let val = input.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      input.value = val.slice(0, 2) + '/' + val.slice(2);
    } else {
      input.value = val;
    }
    const displayExp = document.getElementById('mockCardExpiry');
    if (displayExp) {
      displayExp.textContent = input.value || 'MM/YY';
    }
  }

  function processPayment() {
    const address = validateAddressForm();
    if (!address) {
      setStep(1);
      return;
    }

    // Validate payment method specifics
    if (selectedPaymentMethod === 'card') {
      const cardNum = document.getElementById('cardNumInput')?.value.replace(/\s/g, '');
      const cardExp = document.getElementById('cardExpInput')?.value;
      const cardCvv = document.getElementById('cardCvvInput')?.value;
      if (!cardNum || cardNum.length < 16) {
        Cart.showToast('Please enter a valid 16-digit card number');
        return;
      }
      if (!cardExp || cardExp.length < 5) {
        Cart.showToast('Please enter card expiry MM/YY');
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        Cart.showToast('Please enter a valid 3-digit CVV');
        return;
      }
    }

    // Start simulated processing
    const processingEl = document.getElementById('paymentProcessingOverlay');
    const procStatus = document.getElementById('processingStatusText');
    if (processingEl) processingEl.classList.add('active');

    if (procStatus) procStatus.textContent = 'Establishing 256-bit SSL encrypted connection...';

    setTimeout(() => {
      if (procStatus) procStatus.textContent = 'Authorizing transaction with issuing bank...';
    }, 1100);

    setTimeout(() => {
      if (procStatus) procStatus.textContent = 'Allocating Batch 01 slot & pre-order confirmed!';
      completeOrder(address);
    }, 2200);
  }

  function completeOrder(address) {
    const totals = Cart.getTotals();
    const orderNum = 'PRE-2026-' + Math.floor(1000 + Math.random() * 9000);
    const awb = 'BD-' + Math.floor(10000000 + Math.random() * 90000000);

    // Calculate estimated batch release / delivery date
    const now = new Date();
    const etaDate = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
    const etaStr = 'Batch 01 Dispatch: ' + etaDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const newOrder = {
      orderId: orderNum,
      awb: awb,
      createdAt: now.toISOString(),
      eta: etaStr,
      status: 'Pre-Order Confirmed',
      statusClass: 'confirmed',
      statusText: 'Limited Batch 01 Reserved — Maceration & Maturation in Kannauj',
      courier: 'BlueDart Air Express (Priority)',
      stepIndex: 1,
      recipient: address,
      items: totals.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      total: totals.total,
      paymentMethod: selectedPaymentMethod.toUpperCase(),
      paymentStatus: selectedPaymentMethod === 'cod' ? 'Reserved (COD on Delivery)' : 'Paid & Allocation Confirmed',
      logs: [
        { status: 'Pre-Order Reserved & Batch 01 Slot Allocated', time: 'Just now', hub: 'Aavasa Digital Gateway', latest: true },
        { status: 'Passed Longevity Gas Chromatography Standard', time: 'Lab Queue Active', hub: 'Kannauj Master Perfumery Lab' },
        { status: 'Velvet Cushioning & Crushproof Box Assembly', time: 'Scheduled for Batch Dispatch', hub: 'Aavasa Fulfillment Central' },
        { status: 'Priority Air Express AWB Generated', time: 'Tracking Active', hub: 'BlueDart Air Express' }
      ]
    };

    activeOrder = newOrder;

    // Save order in Tracker repository
    if (typeof Tracker !== 'undefined') {
      Tracker.saveOrder(newOrder);
    }

    // Clear cart
    Cart.clearCart();

    // Show Success screen
    const processingEl = document.getElementById('paymentProcessingOverlay');
    const successEl = document.getElementById('orderSuccessScreen');
    const successOrderId = document.getElementById('successOrderIdDisplay');
    const successAwb = document.getElementById('successAwbDisplay');
    const successEta = document.getElementById('successEtaDisplay');

    if (processingEl) processingEl.classList.remove('active');
    if (successOrderId) successOrderId.textContent = orderNum;
    if (successAwb) successAwb.textContent = awb;
    if (successEta) successEta.textContent = etaStr;

    // Hide checkout form steps, show success screen
    const step1Sec = document.getElementById('checkoutStep1');
    const step2Sec = document.getElementById('checkoutStep2');
    const step3Sec = document.getElementById('checkoutStep3');
    if (step1Sec) step1Sec.style.display = 'none';
    if (step2Sec) step2Sec.style.display = 'none';
    if (step3Sec) step3Sec.style.display = 'none';
    if (successEl) successEl.classList.add('active');

    Cart.showToast(`🎉 Pre-Order ${orderNum} placed successfully!`, 'green');
  }

  function resetForm() {
    currentStep = 1;
    const form = document.getElementById('checkoutAddressForm');
    if (form) form.reset();
  }

  function trackCurrentOrder() {
    if (!activeOrder) return;
    close();
    if (typeof Tracker !== 'undefined') {
      Tracker.trackOrder(activeOrder.orderId);
      const trackerSection = document.getElementById('orderTrackingSection');
      if (trackerSection) {
        trackerSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  // Setup DOM listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Modal close buttons
    const closeBtn = document.getElementById('checkoutCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);

    const overlay = document.getElementById('checkoutModal');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }

    // Step navigation buttons
    const toStep2Btn = document.getElementById('toStep2Btn');
    if (toStep2Btn) {
      toStep2Btn.addEventListener('click', () => {
        if (validateAddressForm()) {
          setStep(2);
        }
      });
    }

    const backToStep1Btn = document.getElementById('backToStep1Btn');
    if (backToStep1Btn) {
      backToStep1Btn.addEventListener('click', () => setStep(1));
    }

    const toStep3Btn = document.getElementById('toStep3Btn');
    if (toStep3Btn) {
      toStep3Btn.addEventListener('click', () => setStep(3));
    }

    const backToStep2Btn = document.getElementById('backToStep2Btn');
    if (backToStep2Btn) {
      backToStep2Btn.addEventListener('click', () => setStep(2));
    }

    // Payment method selector
    document.querySelectorAll('.payment-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setPaymentMethod(btn.dataset.method);
      });
    });

    // Card inputs real-time sync
    const cardNumInput = document.getElementById('cardNumInput');
    if (cardNumInput) {
      cardNumInput.addEventListener('input', () => formatCardNumber(cardNumInput));
    }

    const cardExpInput = document.getElementById('cardExpInput');
    if (cardExpInput) {
      cardExpInput.addEventListener('input', () => formatExpiry(cardExpInput));
    }

    const cardNameInput = document.getElementById('cardNameInput');
    if (cardNameInput) {
      cardNameInput.addEventListener('input', () => {
        const display = document.getElementById('mockCardHolder');
        if (display) display.textContent = cardNameInput.value.toUpperCase() || 'YOUR NAME';
      });
    }

    // Pay Button
    const payBtn = document.getElementById('executePaymentBtn');
    if (payBtn) {
      payBtn.addEventListener('click', processPayment);
    }

    // Track placed order button on success screen
    const trackOrderBtn = document.getElementById('trackPlacedOrderBtn');
    if (trackOrderBtn) {
      trackOrderBtn.addEventListener('click', trackCurrentOrder);
    }
  });

  return {
    open,
    close,
    setStep,
    setPaymentMethod,
    processPayment,
    trackCurrentOrder
  };
})();
