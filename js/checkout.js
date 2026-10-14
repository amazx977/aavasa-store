/**
 * AAVASA / The Bold Rose Luxury Perfumes
 * Fully Functional Payment Portal & Checkout Engine
 * Supports both dedicated checkout.html and in-page modal flows
 */

const Checkout = (function () {
  let currentStep = 1;
  let selectedPaymentMethod = 'upi';
  let activeOrder = null;
  let selectedShippingMethod = 'standard'; // 'standard' (Free) or 'priority' (99)

  /* --------------------------------------------------------------------------
     1. MODAL CHECKOUT FLOW (index.html)
     -------------------------------------------------------------------------- */
  function open() {
    const totals = Cart.getTotals();
    if (totals.items.length === 0) {
      Cart.showToast('Your pre-order bag is empty! Please add a perfume first.');
      return;
    }

    const modal = document.getElementById('checkoutModal');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      setStep(1);
      renderModalOrderSummary();
    } else {
      // If modal does not exist on current page, redirect to checkout.html
      window.location.href = 'checkout.html';
    }
  }

  function close() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      resetModalForm();
    }
  }

  function setStep(step) {
    currentStep = step;

    // Update modal step tabs UI
    document.querySelectorAll('.step-item').forEach((el, idx) => {
      const stepNum = idx + 1;
      el.classList.remove('active', 'completed');
      if (stepNum === currentStep) {
        el.classList.add('active');
      } else if (stepNum < currentStep) {
        el.classList.add('completed');
      }
    });

    // Toggle modal step sections
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

  function renderModalOrderSummary() {
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

  function resetModalForm() {
    currentStep = 1;
    const form = document.getElementById('checkoutAddressForm');
    if (form) form.reset();
  }

  /* --------------------------------------------------------------------------
     2. DEDICATED CHECKOUT PAGE FLOW (checkout.html)
     -------------------------------------------------------------------------- */
  function isPageCheckout() {
    return !!document.getElementById('checkoutPageRoot');
  }

  function initPageCheckout() {
    const totals = Cart.getTotals();
    const emptyState = document.getElementById('checkoutEmptyState');
    const activeGrid = document.getElementById('checkoutActiveGrid');

    if (totals.items.length === 0) {
      if (emptyState) emptyState.classList.remove('d-none');
      if (activeGrid) activeGrid.classList.add('d-none');
      return;
    }

    if (emptyState) emptyState.classList.add('d-none');
    if (activeGrid) activeGrid.classList.remove('d-none');

    renderPageOrderSummary();
    setPageStep(1);
    setPaymentMethod('upi');
  }

  function renderPageOrderSummary() {
    const totals = Cart.getTotals();
    const itemsListEl = document.getElementById('pageSummaryItemsList');
    const subtotalEl = document.getElementById('pageSubtotal');
    const discountEl = document.getElementById('pageDiscount');
    const discountRow = document.getElementById('pageDiscountRow');
    const shippingEl = document.getElementById('pageShipping');
    const grandTotalEl = document.getElementById('pageGrandTotal');
    const upiAmountEl = document.getElementById('pageUpiAmountDisplay');

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
          <div class="summary-item-pricing">
            ₹${(item.price * item.qty).toLocaleString('en-IN')}
          </div>
        </div>
      `).join('');
    }

    const priorityFee = selectedShippingMethod === 'priority' ? 99 : 0;
    const finalShipping = totals.shipping + priorityFee;
    const finalTotal = Math.max(0, totals.subtotal - totals.discount + finalShipping);

    if (subtotalEl) subtotalEl.textContent = `₹${totals.subtotal.toLocaleString('en-IN')}`;
    if (shippingEl) shippingEl.textContent = finalShipping === 0 ? 'FREE' : `₹${finalShipping}`;
    if (discountEl && discountRow) {
      if (totals.discount > 0) {
        discountRow.classList.remove('d-none');
        discountEl.textContent = `-₹${totals.discount.toLocaleString('en-IN')}`;
      } else {
        discountRow.classList.add('d-none');
      }
    }
    if (grandTotalEl) grandTotalEl.textContent = `₹${finalTotal.toLocaleString('en-IN')}`;
    if (upiAmountEl) upiAmountEl.textContent = `₹${finalTotal.toLocaleString('en-IN')}`;

    // Update execute button text
    const executeBtn = document.getElementById('executePagePaymentBtn');
    if (executeBtn) {
      executeBtn.textContent = `🔒 Confirm Pre-Order & Pay ₹${finalTotal.toLocaleString('en-IN')}`;
    }
  }

  function setPageStep(step) {
    currentStep = step;

    // Update step buttons in stepper bar
    const s1Btn = document.getElementById('stepIndicator1');
    const s2Btn = document.getElementById('stepIndicator2');
    const s3Btn = document.getElementById('stepIndicator3');

    [s1Btn, s2Btn, s3Btn].forEach((btn, idx) => {
      if (!btn) return;
      const num = idx + 1;
      btn.classList.remove('active', 'completed');
      if (num === currentStep) btn.classList.add('active');
      else if (num < currentStep) btn.classList.add('completed');
    });

    // Toggle step cards
    const step1Sec = document.getElementById('checkoutPageStep1');
    const step2Sec = document.getElementById('checkoutPageStep2');
    const step3Sec = document.getElementById('checkoutPageStep3');

    if (step1Sec) step1Sec.classList.toggle('d-none', step !== 1);
    if (step2Sec) step2Sec.classList.toggle('d-none', step !== 2);
    if (step3Sec) step3Sec.classList.toggle('d-none', step !== 3);

    // Scroll to top of checkout card on step change
    const root = document.getElementById('checkoutPageRoot');
    if (root) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function autoFillSampleAddress() {
    const nameInput = document.getElementById('pageCustName') || document.getElementById('custName');
    const phoneInput = document.getElementById('pageCustPhone') || document.getElementById('custPhone');
    const emailInput = document.getElementById('pageCustEmail') || document.getElementById('custEmail');
    const addressInput = document.getElementById('pageCustAddress') || document.getElementById('custAddress');
    const cityInput = document.getElementById('pageCustCity') || document.getElementById('custCity');
    const stateInput = document.getElementById('pageCustState') || document.getElementById('custState');
    const pinInput = document.getElementById('pageCustPin') || document.getElementById('custPin');

    if (nameInput) nameInput.value = 'Priya Sharma';
    if (phoneInput) phoneInput.value = '9820144521';
    if (emailInput) emailInput.value = 'priya.sharma@gmail.com';
    if (addressInput) addressInput.value = 'B-402, Sea Green Heights, Worli';
    if (cityInput) cityInput.value = 'Mumbai';
    if (stateInput) stateInput.value = 'Maharashtra';
    if (pinInput) pinInput.value = '400018';

    Cart.showToast('Sample address auto-filled for testing!', 'green');
  }

  function autoFillTestCard() {
    const numInput = document.getElementById('pageCardNumInput') || document.getElementById('cardNumInput');
    const nameInput = document.getElementById('pageCardNameInput') || document.getElementById('cardNameInput');
    const expInput = document.getElementById('pageCardExpInput') || document.getElementById('cardExpInput');
    const cvvInput = document.getElementById('pageCardCvvInput') || document.getElementById('cardCvvInput');

    if (numInput) {
      numInput.value = '4111 2222 3333 4444';
      formatCardNumber(numInput);
    }
    if (nameInput) {
      nameInput.value = 'PRIYA SHARMA';
      const mockHolder = document.getElementById('pageMockHolder') || document.getElementById('mockCardHolder');
      if (mockHolder) mockHolder.textContent = 'PRIYA SHARMA';
    }
    if (expInput) {
      expInput.value = '12/28';
      formatExpiry(expInput);
    }
    if (cvvInput) cvvInput.value = '842';

    Cart.showToast('Test card details auto-filled!', 'green');
  }

  function validateAddressForm() {
    const isPage = isPageCheckout();
    const name = (isPage ? document.getElementById('pageCustName') : document.getElementById('custName'))?.value.trim();
    const phone = (isPage ? document.getElementById('pageCustPhone') : document.getElementById('custPhone'))?.value.trim();
    const email = (isPage ? document.getElementById('pageCustEmail') : document.getElementById('custEmail'))?.value.trim();
    const address = (isPage ? document.getElementById('pageCustAddress') : document.getElementById('custAddress'))?.value.trim();
    const city = (isPage ? document.getElementById('pageCustCity') : document.getElementById('custCity'))?.value.trim();
    const state = (isPage ? document.getElementById('pageCustState') : document.getElementById('custState'))?.value.trim();
    const pin = (isPage ? document.getElementById('pageCustPin') : document.getElementById('custPin'))?.value.trim();

    if (!name) { Cart.showToast('Please enter your full name'); return false; }
    if (!phone || phone.length < 10) { Cart.showToast('Please enter a valid 10-digit mobile number'); return false; }
    if (!email || !email.includes('@')) { Cart.showToast('Please enter a valid email address'); return false; }
    if (!address) { Cart.showToast('Please enter your delivery street address'); return false; }
    if (!city) { Cart.showToast('Please enter your city'); return false; }
    if (!state) { Cart.showToast('Please enter your state'); return false; }
    if (!pin || pin.length < 6) { Cart.showToast('Please enter a valid 6-digit PIN code'); return false; }

    return { name, phone, email, address, city, state, pin };
  }

  function setPaymentMethod(method) {
    selectedPaymentMethod = method;

    // Toggle active tab buttons across page & modal
    document.querySelectorAll('.payment-tab-btn, .payment-portal-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.method === method);
    });

    // Modal panels
    const upiPanel = document.getElementById('upiPanel');
    const cardPanel = document.getElementById('cardPanel');
    const netbankingPanel = document.getElementById('netbankingPanel');
    const codPanel = document.getElementById('codPanel');

    if (upiPanel) upiPanel.style.display = method === 'upi' ? 'block' : 'none';
    if (cardPanel) cardPanel.style.display = method === 'card' ? 'block' : 'none';
    if (netbankingPanel) netbankingPanel.style.display = method === 'netbanking' ? 'block' : 'none';
    if (codPanel) codPanel.style.display = method === 'cod' ? 'block' : 'none';

    // Page panels
    const pageUpi = document.getElementById('pageUpiPanel');
    const pageCard = document.getElementById('pageCardPanel');
    const pageNetbanking = document.getElementById('pageNetbankingPanel');
    const pageCod = document.getElementById('pageCodPanel');

    if (pageUpi) pageUpi.classList.toggle('d-none', method !== 'upi');
    if (pageCard) pageCard.classList.toggle('d-none', method !== 'card');
    if (pageNetbanking) pageNetbanking.classList.toggle('d-none', method !== 'netbanking');
    if (pageCod) pageCod.classList.toggle('d-none', method !== 'cod');
  }

  function formatCardNumber(input) {
    let val = input.value.replace(/\D/g, '').slice(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    input.value = formatted;

    const displayNum = document.getElementById('pageMockNumber') || document.getElementById('mockCardNumber');
    if (displayNum) {
      displayNum.textContent = formatted || '•••• •••• •••• ••••';
    }

    // Detect card brand
    const brandDisplay = document.getElementById('pageMockBrand') || document.getElementById('mockCardBrand');
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
    const displayExp = document.getElementById('pageMockExpiry') || document.getElementById('mockCardExpiry');
    if (displayExp) {
      displayExp.textContent = input.value || 'MM/YY';
    }
  }

  /* --------------------------------------------------------------------------
     3. PAYMENT EXECUTION & ORDER CONFIRMATION
     -------------------------------------------------------------------------- */
  function processPayment() {
    const isPage = isPageCheckout();
    const address = validateAddressForm();
    if (!address) {
      if (isPage) setPageStep(1);
      else setStep(1);
      return;
    }

    // Validate card specifics if card method selected
    if (selectedPaymentMethod === 'card') {
      const cardNum = (isPage ? document.getElementById('pageCardNumInput') : document.getElementById('cardNumInput'))?.value.replace(/\s/g, '');
      const cardExp = (isPage ? document.getElementById('pageCardExpInput') : document.getElementById('cardExpInput'))?.value;
      const cardCvv = (isPage ? document.getElementById('pageCardCvvInput') : document.getElementById('cardCvvInput'))?.value;

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
    const processingEl = isPage ? document.getElementById('pageProcessingOverlay') : document.getElementById('paymentProcessingOverlay');
    const procStatus = isPage ? document.getElementById('pageProcessingStatusText') : document.getElementById('processingStatusText');

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
    const isPage = isPageCheckout();
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

    let paymentMethodDisplay = selectedPaymentMethod.toUpperCase();
    if (selectedPaymentMethod === 'netbanking') {
      const bank = document.querySelector('input[name="pageBank"]:checked')?.value || 'HDFC Bank';
      paymentMethodDisplay = `NETBANKING (${bank.toUpperCase()})`;
    }

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
      shipping: finalShipping,
      total: finalTotal,
      paymentMethod: paymentMethodDisplay,
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

    // Clear cart items
    Cart.clearCart();

    if (isPage) {
      // Hide page processing overlay and steps, reveal success screen
      const processingEl = document.getElementById('pageProcessingOverlay');
      const successEl = document.getElementById('pageSuccessScreen');
      const step1 = document.getElementById('checkoutPageStep1');
      const step2 = document.getElementById('checkoutPageStep2');
      const step3 = document.getElementById('checkoutPageStep3');
      const stepper = document.querySelector('.checkout-stepper');
      const expressBox = document.querySelector('.express-checkout-box');

      if (processingEl) processingEl.classList.remove('active');
      if (step1) step1.classList.add('d-none');
      if (step2) step2.classList.add('d-none');
      if (step3) step3.classList.add('d-none');
      if (stepper) stepper.classList.add('d-none');
      if (expressBox) expressBox.classList.add('d-none');

      const successOrderId = document.getElementById('pageSuccessOrderId');
      const successAwb = document.getElementById('pageSuccessAwb');
      const successEta = document.getElementById('pageSuccessEta');
      const successPayment = document.getElementById('pageSuccessPayment');
      const successAddress = document.getElementById('pageSuccessAddress');
      const trackBtn = document.getElementById('pageTrackOrderBtn');

      if (successOrderId) successOrderId.textContent = orderNum;
      if (successAwb) successAwb.textContent = awb;
      if (successEta) successEta.textContent = etaStr;
      if (successPayment) successPayment.textContent = newOrder.paymentStatus;
      if (successAddress) successAddress.textContent = `${address.city}, ${address.state}`;
      if (trackBtn) trackBtn.href = `track.html?id=${orderNum}`;

      if (successEl) successEl.classList.add('active');
    } else {
      // Modal success screen
      const processingEl = document.getElementById('paymentProcessingOverlay');
      const successEl = document.getElementById('orderSuccessScreen');
      const successOrderId = document.getElementById('successOrderIdDisplay');
      const successAwb = document.getElementById('successAwbDisplay');
      const successEta = document.getElementById('successEtaDisplay');

      if (processingEl) processingEl.classList.remove('active');
      if (successOrderId) successOrderId.textContent = orderNum;
      if (successAwb) successAwb.textContent = awb;
      if (successEta) successEta.textContent = etaStr;

      const step1Sec = document.getElementById('checkoutStep1');
      const step2Sec = document.getElementById('checkoutStep2');
      const step3Sec = document.getElementById('checkoutStep3');
      if (step1Sec) step1Sec.style.display = 'none';
      if (step2Sec) step2Sec.style.display = 'none';
      if (step3Sec) step3Sec.style.display = 'none';
      if (successEl) successEl.classList.add('active');
    }

    Cart.showToast(`🎉 Pre-Order ${orderNum} placed successfully!`, 'green');
  }

  /* --------------------------------------------------------------------------
     4. DOM EVENT LISTENERS & ATTACHMENTS
     -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    // Check if on dedicated checkout.html page
    if (isPageCheckout()) {
      initPageCheckout();

      // Listen for cart changes
      window.addEventListener('cartUpdated', () => {
        initPageCheckout();
      });

      // Quick sample pre-order button
      const quickBtn = document.getElementById('quickSamplePreOrderBtn');
      if (quickBtn) {
        quickBtn.addEventListener('click', () => {
          Cart.addItem('prod-adore', 1);
          initPageCheckout();
        });
      }

      // Quantity controls on checkout page
      const itemsListEl = document.getElementById('pageSummaryItemsList');
      if (itemsListEl) {
        itemsListEl.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-action]');
          if (!btn) return;
          const action = btn.dataset.action;
          const id = btn.dataset.id;
          if (action === 'checkout-qty') {
            const delta = parseInt(btn.dataset.delta, 10);
            Cart.updateQty(id, delta);
            renderPageOrderSummary();
          } else if (action === 'checkout-remove') {
            Cart.removeItem(id);
            initPageCheckout();
          }
        });
      }

      // Coupon code apply button
      const couponInput = document.getElementById('pageCouponInput');
      const couponBtn = document.getElementById('pageApplyCouponBtn');
      if (couponBtn && couponInput) {
        couponBtn.addEventListener('click', () => {
          const res = Cart.applyCouponCode(couponInput.value);
          Cart.showToast(res.message, res.success ? 'green' : 'orange');
          renderPageOrderSummary();
        });
      }

      // Auto-fill address
      const autoFillBtn = document.getElementById('autoFillAddressBtn');
      if (autoFillBtn) autoFillBtn.addEventListener('click', autoFillSampleAddress);

      // Auto-fill card
      const autoCardBtn = document.getElementById('autoFillCardBtn');
      if (autoCardBtn) autoCardBtn.addEventListener('click', autoFillTestCard);

      // Page Stepper navigation
      const pTo2 = document.getElementById('pageToStep2Btn');
      if (pTo2) {
        pTo2.addEventListener('click', () => {
          if (validateAddressForm()) setPageStep(2);
        });
      }

      const pBack1 = document.getElementById('pageBackToStep1Btn');
      if (pBack1) pBack1.addEventListener('click', () => setPageStep(1));

      const pTo3 = document.getElementById('pageToStep3Btn');
      if (pTo3) pTo3.addEventListener('click', () => setPageStep(3));

      const pBack2 = document.getElementById('pageBackToStep2Btn');
      if (pBack2) pBack2.addEventListener('click', () => setPageStep(2));

      // Batch selection
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

      // Express 1-click Pay
      const expressHandler = () => {
        autoFillSampleAddress();
        setPaymentMethod('upi');
        setPageStep(3);
        Cart.showToast('⚡ Express pre-order initialized via UPI! Click Confirm Pre-Order below.', 'green');
      };

      const expUpi = document.getElementById('expressUpiBtn');
      const expGPay = document.getElementById('expressGPayBtn');
      const expPhonePe = document.getElementById('expressPhonePeBtn');
      if (expUpi) expUpi.addEventListener('click', expressHandler);
      if (expGPay) expGPay.addEventListener('click', expressHandler);
      if (expPhonePe) expPhonePe.addEventListener('click', expressHandler);

      // Copy UPI
      const pageCopyUpi = document.getElementById('pageCopyUpiBtn');
      if (pageCopyUpi) {
        pageCopyUpi.addEventListener('click', () => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText('aavasa.perfumes@icici').then(() => {
              Cart.showToast('UPI ID copied to clipboard!', 'green');
            });
          }
        });
      }

      // Verify UPI
      const pageVerifyUpi = document.getElementById('pageVerifyUpiBtn');
      if (pageVerifyUpi) {
        pageVerifyUpi.addEventListener('click', () => {
          const vpa = document.getElementById('pageUserUpiId')?.value.trim();
          if (vpa && vpa.includes('@')) {
            Cart.showToast(`VPA ${vpa} verified successfully! Click Confirm Pre-Order below.`, 'green');
          } else {
            Cart.showToast('Please enter a valid VPA ID (e.g. name@okhdfcbank)');
          }
        });
      }

      // Card inputs sync on page
      const pCardNum = document.getElementById('pageCardNumInput');
      if (pCardNum) pCardNum.addEventListener('input', () => formatCardNumber(pCardNum));

      const pCardExp = document.getElementById('pageCardExpInput');
      if (pCardExp) pCardExp.addEventListener('input', () => formatExpiry(pCardExp));

      const pCardName = document.getElementById('pageCardNameInput');
      if (pCardName) {
        pCardName.addEventListener('input', () => {
          const mockHolder = document.getElementById('pageMockHolder');
          if (mockHolder) mockHolder.textContent = pCardName.value.toUpperCase() || 'YOUR NAME';
        });
      }

      // Execute Page Payment
      const executePageBtn = document.getElementById('executePagePaymentBtn');
      if (executePageBtn) {
        executePageBtn.addEventListener('click', processPayment);
      }

      // Print Invoice button on page
      const printInvoiceBtn = document.getElementById('pagePrintInvoiceBtn');
      if (printInvoiceBtn) {
        printInvoiceBtn.addEventListener('click', () => {
          if (activeOrder && typeof Tracker !== 'undefined') {
            Tracker.openInvoice(activeOrder);
          }
        });
      }
    }

    // Modal close & triggers
    const closeBtn = document.getElementById('checkoutCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);

    const overlay = document.getElementById('checkoutModal');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }

    // Modal Step navigation
    const toStep2Btn = document.getElementById('toStep2Btn');
    if (toStep2Btn) {
      toStep2Btn.addEventListener('click', () => {
        if (validateAddressForm()) setStep(2);
      });
    }

    const backToStep1Btn = document.getElementById('backToStep1Btn');
    if (backToStep1Btn) backToStep1Btn.addEventListener('click', () => setStep(1));

    const toStep3Btn = document.getElementById('toStep3Btn');
    if (toStep3Btn) toStep3Btn.addEventListener('click', () => setStep(3));

    const backToStep2Btn = document.getElementById('backToStep2Btn');
    if (backToStep2Btn) backToStep2Btn.addEventListener('click', () => setStep(2));

    // Shared Payment tabs
    document.querySelectorAll('.payment-tab-btn, .payment-portal-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        setPaymentMethod(btn.dataset.method);
      });
    });

    // Modal Card inputs sync
    const cardNumInput = document.getElementById('cardNumInput');
    if (cardNumInput) cardNumInput.addEventListener('input', () => formatCardNumber(cardNumInput));

    const cardExpInput = document.getElementById('cardExpInput');
    if (cardExpInput) cardExpInput.addEventListener('input', () => formatExpiry(cardExpInput));

    const cardNameInput = document.getElementById('cardNameInput');
    if (cardNameInput) {
      cardNameInput.addEventListener('input', () => {
        const display = document.getElementById('mockCardHolder');
        if (display) display.textContent = cardNameInput.value.toUpperCase() || 'YOUR NAME';
      });
    }

    // Modal Pay Button
    const payBtn = document.getElementById('executePaymentBtn');
    if (payBtn) payBtn.addEventListener('click', processPayment);

    // Modal Track Button
    const trackOrderBtn = document.getElementById('trackPlacedOrderBtn');
    if (trackOrderBtn) trackOrderBtn.addEventListener('click', () => {
      if (!activeOrder) return;
      close();
      if (typeof Tracker !== 'undefined') {
        Tracker.trackOrder(activeOrder.orderId);
        const trackerSection = document.getElementById('track') || document.getElementById('orderTrackingSection');
        if (trackerSection) trackerSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  return {
    open,
    close,
    setStep,
    setPageStep,
    setPaymentMethod,
    processPayment,
    autoFillSampleAddress,
    autoFillTestCard
  };
})();
