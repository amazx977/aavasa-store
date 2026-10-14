/**
 * AAVASA / The Bold Rose Luxury Perfumes
 * Dedicated Admin Portal Controller
 * Manages Pre-Orders, Logistics Updates, Checkpoints, and Live Sync
 */

const Admin = (function () {
  const PIN_SESSION_KEY = 'aavasa_admin_authenticated';
  let activeDetailOrder = null;
  let currentSearchQuery = '';
  let currentStatusFilter = 'all';
  let currentPaymentFilter = 'all';
  let currentSort = 'newest';

  function init() {
    initClock();
    checkAuth();
    populateProductDropdown();
    attachEventListeners();
    refreshDashboard();
  }

  /* -----------------------------------------------------------------------------
     1. AUTHENTICATION & SECURITY PIN
     ----------------------------------------------------------------------------- */
  function checkAuth() {
    const isAuth = sessionStorage.getItem(PIN_SESSION_KEY) === 'true';
    const pinModal = document.getElementById('adminPinModal');
    if (!isAuth && pinModal) {
      pinModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      const input = document.getElementById('adminPinInput');
      if (input) setTimeout(() => input.focus(), 200);
    }
  }

  function handlePinSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('adminPinInput');
    const enteredPin = (input ? input.value : '').trim();

    // Default PIN: admin123
    if (enteredPin === 'admin123') {
      sessionStorage.setItem(PIN_SESSION_KEY, 'true');
      const pinModal = document.getElementById('adminPinModal');
      if (pinModal) pinModal.classList.remove('open');
      document.body.style.overflow = '';
      if (input) input.value = '';
      Cart.showToast('Authentication verified. Welcome to Operations Hub!', 'green');
    } else {
      Cart.showToast('Invalid PIN. Hint: default is admin123');
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  }

  function lockPortal() {
    sessionStorage.removeItem(PIN_SESSION_KEY);
    checkAuth();
    Cart.showToast('Portal locked.');
  }

  /* -----------------------------------------------------------------------------
     2. REAL-TIME CLOCK
     ----------------------------------------------------------------------------- */
  function initClock() {
    const clockEl = document.getElementById('adminClock');
    function update() {
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
    }
    update();
    setInterval(update, 1000);
  }

  /* -----------------------------------------------------------------------------
     3. KPI METRIC COMPUTATIONS
     ----------------------------------------------------------------------------- */
  function updateKPIs(orders) {
    const totalOrders = orders.length;
    const totalRev = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const aov = totalOrders > 0 ? Math.round(totalRev / totalOrders) : 0;

    const inLabCount = orders.filter(o => 
      o.stepIndex <= 2 || (o.status && o.status.toLowerCase().includes('confirmed'))
    ).length;

    const inTransitCount = orders.filter(o => 
      o.stepIndex === 3 || o.stepIndex === 4 || (o.status && (o.status.toLowerCase().includes('transit') || o.status.toLowerCase().includes('delivery')))
    ).length;

    const deliveredCount = orders.filter(o => 
      o.stepIndex === 5 || (o.status && o.status.toLowerCase().includes('delivered'))
    ).length;

    const kpiTotalEl = document.getElementById('kpiTotalOrders');
    const kpiRevEl = document.getElementById('kpiTotalRevenue');
    const kpiAovEl = document.getElementById('kpiAov');
    const kpiInLabEl = document.getElementById('kpiInLab');
    const kpiInTransitEl = document.getElementById('kpiInTransit');
    const kpiDeliveredEl = document.getElementById('kpiDelivered');

    if (kpiTotalEl) kpiTotalEl.textContent = totalOrders;
    if (kpiRevEl) kpiRevEl.textContent = `₹${totalRev.toLocaleString('en-IN')}`;
    if (kpiAovEl) kpiAovEl.textContent = `₹${aov.toLocaleString('en-IN')}`;
    if (kpiInLabEl) kpiInLabEl.textContent = inLabCount;
    if (kpiInTransitEl) kpiInTransitEl.textContent = inTransitCount;
    if (kpiDeliveredEl) kpiDeliveredEl.textContent = deliveredCount;
  }

  /* -----------------------------------------------------------------------------
     4. TABLE RENDERING & FILTERING
     ----------------------------------------------------------------------------- */
  function getFilteredOrders() {
    let orders = typeof Tracker !== 'undefined' ? Tracker.getStoredOrders() : [];

    // Filter by Search Query
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      orders = orders.filter(o => {
        const idMatch = (o.orderId || '').toLowerCase().includes(q);
        const awbMatch = (o.awb || '').toLowerCase().includes(q);
        const nameMatch = (o.recipient && o.recipient.name ? o.recipient.name.toLowerCase() : '').includes(q);
        const phoneMatch = (o.recipient && o.recipient.phone ? o.recipient.phone.replace(/\D/g, '') : '').includes(q.replace(/\D/g, ''));
        const emailMatch = (o.recipient && o.recipient.email ? o.recipient.email.toLowerCase() : '').includes(q);
        const cityMatch = (o.recipient && o.recipient.city ? o.recipient.city.toLowerCase() : '').includes(q);
        return idMatch || awbMatch || nameMatch || phoneMatch || emailMatch || cityMatch;
      });
    }

    // Filter by Status
    if (currentStatusFilter !== 'all') {
      orders = orders.filter(o => {
        if (currentStatusFilter === 'Pre-Order Confirmed') {
          return o.stepIndex === 1 || (o.status && o.status.toLowerCase().includes('confirmed'));
        }
        if (currentStatusFilter === 'Lab Batch Tested') {
          return o.stepIndex === 2 || (o.status && o.status.toLowerCase().includes('lab'));
        }
        if (currentStatusFilter === 'Velvet Packed') {
          return o.stepIndex === 3 || (o.status && o.status.toLowerCase().includes('packed'));
        }
        if (currentStatusFilter === 'In Transit') {
          return o.status === 'In Transit';
        }
        if (currentStatusFilter === 'Out for Delivery') {
          return o.status === 'Out for Delivery';
        }
        if (currentStatusFilter === 'Delivered') {
          return o.stepIndex === 5 || o.status === 'Delivered';
        }
        return true;
      });
    }

    // Filter by Payment
    if (currentPaymentFilter !== 'all') {
      orders = orders.filter(o => {
        const method = (o.paymentMethod || '').toLowerCase();
        if (currentPaymentFilter === 'upi') return method.includes('upi') || method.includes('gpay') || method.includes('phonepe');
        if (currentPaymentFilter === 'card') return method.includes('card') || method.includes('visa');
        if (currentPaymentFilter === 'netbanking') return method.includes('bank');
        if (currentPaymentFilter === 'cod') return method.includes('cod') || method.includes('cash');
        return true;
      });
    }

    // Sort
    if (currentSort === 'newest') {
      orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (currentSort === 'oldest') {
      orders.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (currentSort === 'amount-high') {
      orders.sort((a, b) => (b.total || 0) - (a.total || 0));
    } else if (currentSort === 'amount-low') {
      orders.sort((a, b) => (a.total || 0) - (b.total || 0));
    }

    return orders;
  }

  function renderTable() {
    const rawOrders = typeof Tracker !== 'undefined' ? Tracker.getStoredOrders() : [];
    updateKPIs(rawOrders);

    const orders = getFilteredOrders();
    const tbody = document.getElementById('adminOrdersTableBody');
    const emptyState = document.getElementById('adminTableEmptyState');
    const countDisplay = document.getElementById('tableCountDisplay');

    if (countDisplay) {
      countDisplay.textContent = `Pre-Orders (${orders.length} of ${rawOrders.length} total)`;
    }

    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.classList.add('active');
      return;
    }

    if (emptyState) emptyState.classList.remove('active');

    tbody.innerHTML = orders.map(order => {
      // Date formatting
      const dateObj = new Date(order.createdAt || Date.now());
      const dateFormatted = dateObj.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Item mini thumbnails
      const thumbsHtml = (order.items || []).slice(0, 3).map(item => `
        <img src="${item.image}" alt="${item.name}" class="mini-thumb" title="${item.name} (${item.qty}x)">
      `).join('');

      const totalItemsQty = (order.items || []).reduce((s, i) => s + (i.qty || 1), 0);

      // Status pill class
      let pillClass = 'confirmed';
      if (order.status === 'Delivered' || order.stepIndex === 5) pillClass = 'delivered';
      else if (order.status === 'Out for Delivery' || order.stepIndex === 4) pillClass = 'out-delivery';
      else if (order.status === 'In Transit' || order.stepIndex === 3) pillClass = 'in-transit';

      // Payment tag
      const isCod = (order.paymentMethod || '').toLowerCase().includes('cod') || (order.paymentMethod || '').toLowerCase().includes('cash');

      return `
        <tr data-orderid="${order.orderId}">
          <td>
            <div class="order-id-badge">${order.orderId}</div>
            <div class="order-date-text">${dateFormatted} • ${timeFormatted}</div>
          </td>
          <td>
            <div class="customer-name">${order.recipient ? order.recipient.name : 'Guest Customer'}</div>
            <div class="customer-meta">${order.recipient ? `${order.recipient.city} • ${order.recipient.phone}` : ''}</div>
          </td>
          <td>
            <div class="items-preview-stack">
              ${thumbsHtml}
              <span class="items-summary-text">${totalItemsQty} bottle${totalItemsQty > 1 ? 's' : ''}</span>
            </div>
          </td>
          <td>
            <strong>₹${(order.total || 0).toLocaleString('en-IN')}</strong>
            <div>
              <span class="payment-tag ${isCod ? 'cod' : 'paid'}">
                ${isCod ? 'COD (Pending)' : 'PAID'}
              </span>
            </div>
          </td>
          <td>
            <span class="table-status-pill ${pillClass}">
              ● ${order.status || 'Pre-Order Confirmed'}
            </span>
            <div style="font-size: 0.72rem; color: var(--c-choco-500); margin-top: 2px;">
              Stage ${order.stepIndex || 1} of 5
            </div>
          </td>
          <td>
            <div style="font-weight: 700; font-family: monospace; font-size: 0.82rem; color: var(--c-choco-800);">
              ${order.awb || 'Pending'}
            </div>
            <div style="font-size: 0.74rem; color: var(--c-choco-500);">${order.courier || 'BlueDart'}</div>
          </td>
          <td>
            <div class="table-actions">
              <button class="action-icon-btn primary" data-action="view" data-orderid="${order.orderId}" title="Inspect Pre-Order">
                👁️ View
              </button>
              <button class="action-icon-btn" data-action="edit" data-orderid="${order.orderId}" title="Update Logistics & AWB">
                ✏️ Edit
              </button>
              <button class="action-icon-btn" data-action="invoice" data-orderid="${order.orderId}" title="Print Tax Invoice">
                📄
              </button>
              <button class="action-icon-btn danger" data-action="delete" data-orderid="${order.orderId}" title="Delete Record">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function refreshDashboard() {
    renderTable();
  }

  /* -----------------------------------------------------------------------------
     5. INSPECT ORDER DETAILS MODAL
     ----------------------------------------------------------------------------- */
  function openDetailModal(orderId) {
    const orders = typeof Tracker !== 'undefined' ? Tracker.getStoredOrders() : [];
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    activeDetailOrder = order;

    const modal = document.getElementById('adminDetailModal');
    const titleEl = document.getElementById('detailModalTitle');
    const bodyEl = document.getElementById('detailModalBody');

    if (titleEl) titleEl.textContent = `Pre-Order Summary: ${order.orderId}`;

    if (bodyEl) {
      const itemsHtml = (order.items || []).map(item => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed var(--c-cream-300);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${item.image}" alt="${item.name}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid var(--c-cream-400);">
            <div>
              <div style="font-weight: 700; color: var(--c-choco-900);">${item.name}</div>
              <div style="font-size: 0.78rem; color: var(--c-choco-500);">${item.size} • Qty: ${item.qty}</div>
            </div>
          </div>
          <div style="font-weight: 700; color: var(--c-choco-800);">
            ₹${(item.price * item.qty).toLocaleString('en-IN')}
          </div>
        </div>
      `).join('');

      const logsHtml = (order.logs || []).map((log, idx) => `
        <div style="padding: 8px 12px; margin-bottom: 6px; background-color: #fff; border-left: 3px solid ${idx === 0 ? 'var(--c-orange-500)' : 'var(--c-cream-400)'}; border-radius: 2px;">
          <div style="font-weight: 600; font-size: 0.84rem; color: var(--c-choco-900);">${log.status}</div>
          <div style="font-size: 0.74rem; color: var(--c-choco-500);">${log.time} • ${log.hub}</div>
        </div>
      `).join('');

      bodyEl.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div style="background-color: #fff; padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--c-cream-300);">
            <div style="font-weight: 700; font-size: 0.8rem; text-transform: uppercase; color: var(--c-choco-500); margin-bottom: 6px;">Customer & Delivery Address</div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--c-choco-900);">${order.recipient?.name || 'N/A'}</div>
            <div style="font-size: 0.82rem; color: var(--c-choco-700);">${order.recipient?.phone || ''}</div>
            <div style="font-size: 0.82rem; color: var(--c-choco-700);">${order.recipient?.email || ''}</div>
            <div style="font-size: 0.82rem; color: var(--c-choco-600); margin-top: 6px; line-height: 1.4;">
              ${order.recipient?.address || ''}<br>
              ${order.recipient?.city || ''}, ${order.recipient?.state || ''} - ${order.recipient?.pin || ''}
            </div>
          </div>

          <div style="background-color: #fff; padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--c-cream-300);">
            <div style="font-weight: 700; font-size: 0.8rem; text-transform: uppercase; color: var(--c-choco-500); margin-bottom: 6px;">Fulfillment & Courier Info</div>
            <div style="font-size: 0.85rem; margin-bottom: 4px;">
              <strong>Courier:</strong> ${order.courier || 'BlueDart Air Express'}
            </div>
            <div style="font-size: 0.85rem; margin-bottom: 4px;">
              <strong>AWB Code:</strong> <span style="font-family: monospace; font-weight: bold; color: var(--c-orange-600);">${order.awb || 'Pending'}</span>
            </div>
            <div style="font-size: 0.85rem; margin-bottom: 4px;">
              <strong>Stage:</strong> Step ${order.stepIndex || 1} of 5 (${order.status})
            </div>
            <div style="font-size: 0.85rem; margin-bottom: 4px;">
              <strong>Target Release:</strong> ${order.eta || 'Batch 01'}
            </div>
            <div style="font-size: 0.85rem; margin-top: 6px;">
              <strong>Payment:</strong> ${order.paymentMethod || 'UPI'} (${order.paymentStatus || 'Verified'})
            </div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 0.92rem; margin-bottom: 10px; color: var(--c-choco-900);">Fragrance Items Ordered</h4>
          ${itemsHtml}
          
          <div style="margin-left: auto; max-width: 240px; margin-top: 12px; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span>Subtotal:</span>
              <span>₹${(order.subtotal || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; color: var(--c-green-700);">
              <span>Discount:</span>
              <span>-₹${(order.discount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>Air Shipping:</span>
              <span>${order.shipping === 0 ? 'FREE' : '₹' + order.shipping}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1rem; border-top: 1px solid var(--c-choco-800); padding-top: 4px; color: var(--c-orange-600);">
              <span>Total Paid:</span>
              <span>₹${(order.total || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 style="font-size: 0.92rem; margin-bottom: 8px; color: var(--c-choco-900);">Live Checkpoint Audit Logs</h4>
          ${logsHtml}
        </div>
      `;
    }

    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDetailModal() {
    const modal = document.getElementById('adminDetailModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  /* -----------------------------------------------------------------------------
     6. UPDATE STATUS & LOGISTICS MODAL
     ----------------------------------------------------------------------------- */
  function openStatusModal(orderId) {
    const orders = typeof Tracker !== 'undefined' ? Tracker.getStoredOrders() : [];
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    closeDetailModal();

    const modal = document.getElementById('adminStatusModal');
    const idInput = document.getElementById('editOrderId');
    const idDisplay = document.getElementById('editOrderIdDisplay');
    const stageSelect = document.getElementById('editStageSelect');
    const statusTextInput = document.getElementById('editStatusText');
    const courierSelect = document.getElementById('editCourierName');
    const awbInput = document.getElementById('editAwbInput');
    const etaInput = document.getElementById('editEtaInput');

    if (idInput) idInput.value = order.orderId;
    if (idDisplay) idDisplay.textContent = `${order.orderId} • ${order.recipient?.name || 'Customer'}`;
    if (stageSelect) stageSelect.value = order.stepIndex || 1;
    if (statusTextInput) statusTextInput.value = order.statusText || order.status || '';
    if (courierSelect) courierSelect.value = order.courier || 'BlueDart Air Express';
    if (awbInput) awbInput.value = order.awb || '';
    if (etaInput) etaInput.value = order.eta || '';

    // Clear new checkpoint inputs
    const newStatus = document.getElementById('newCheckpointStatus');
    const newHub = document.getElementById('newCheckpointHub');
    if (newStatus) newStatus.value = '';
    if (newHub) newHub.value = '';

    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeStatusModal() {
    const modal = document.getElementById('adminStatusModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function handleStatusUpdate(e) {
    e.preventDefault();
    const orderId = document.getElementById('editOrderId')?.value;
    const stepIndex = parseInt(document.getElementById('editStageSelect')?.value || '1', 10);
    const statusText = document.getElementById('editStatusText')?.value.trim();
    const courier = document.getElementById('editCourierName')?.value;
    const awb = document.getElementById('editAwbInput')?.value.trim();
    const eta = document.getElementById('editEtaInput')?.value.trim();

    const newCpStatus = document.getElementById('newCheckpointStatus')?.value.trim();
    const newCpHub = document.getElementById('newCheckpointHub')?.value.trim();

    // Map step stage to status headline
    let statusName = 'Pre-Order Confirmed';
    let statusClass = 'confirmed';
    if (stepIndex === 2) { statusName = 'Lab Batch Tested'; statusClass = 'confirmed'; }
    else if (stepIndex === 3) { statusName = 'Velvet Packed'; statusClass = 'in-transit'; }
    else if (stepIndex === 4) { statusName = 'Out for Delivery'; statusClass = 'out-delivery'; }
    else if (stepIndex === 5) { statusName = 'Delivered'; statusClass = 'delivered'; }

    const orders = typeof Tracker !== 'undefined' ? Tracker.getStoredOrders() : [];
    const targetOrder = orders.find(o => o.orderId === orderId);
    if (!targetOrder) return;

    const existingLogs = Array.isArray(targetOrder.logs) ? [...targetOrder.logs] : [];

    // Prepend new checkpoint if provided
    if (newCpStatus) {
      existingLogs.forEach(l => l.latest = false);
      existingLogs.unshift({
        status: newCpStatus,
        time: 'Just now (Updated by Ops)',
        hub: newCpHub || 'Aavasa Central Logistics Hub',
        latest: true
      });
    }

    const updates = {
      stepIndex: stepIndex,
      status: statusName,
      statusClass: statusClass,
      statusText: statusText || `${statusName} — Handled by ${courier}`,
      courier: courier,
      awb: awb,
      eta: eta,
      logs: existingLogs
    };

    if (typeof Tracker !== 'undefined') {
      Tracker.updateOrder(orderId, updates);
    }

    closeStatusModal();
    refreshDashboard();
    Cart.showToast(`Pre-Order ${orderId} updated! Synced to live tracking page.`, 'green');
  }

  /* -----------------------------------------------------------------------------
     7. CREATE MANUAL PRE-ORDER
     ----------------------------------------------------------------------------- */
  function populateProductDropdown() {
    const select = document.getElementById('newProductSelect');
    if (!select || typeof PRODUCTS_DATA === 'undefined') return;

    select.innerHTML = PRODUCTS_DATA.map(p => `
      <option value="${p.id}">${p.name} (₹${p.price}) • ${p.size}</option>
    `).join('');
  }

  function openNewOrderModal() {
    const modal = document.getElementById('adminNewOrderModal');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeNewOrderModal() {
    const modal = document.getElementById('adminNewOrderModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      const form = document.getElementById('adminNewOrderForm');
      if (form) form.reset();
    }
  }

  function handleCreateNewOrder(e) {
    e.preventDefault();
    const name = document.getElementById('newCustName')?.value.trim();
    const phone = document.getElementById('newCustPhone')?.value.trim();
    const email = document.getElementById('newCustEmail')?.value.trim();
    const address = document.getElementById('newCustAddress')?.value.trim();
    const city = document.getElementById('newCustCity')?.value.trim();
    const state = document.getElementById('newCustState')?.value.trim();
    const pin = document.getElementById('newCustPin')?.value.trim();
    const productId = document.getElementById('newProductSelect')?.value;
    const qty = parseInt(document.getElementById('newProductQty')?.value || '1', 10);
    const paymentMethod = document.getElementById('newPaymentMethod')?.value || 'UPI';
    const courier = document.getElementById('newCourierChoice')?.value || 'BlueDart Air Express';

    if (!name || !phone || !email || !address) {
      Cart.showToast('Please fill all required customer fields');
      return;
    }

    const product = typeof getProductById === 'function' ? getProductById(productId) : null;
    if (!product) {
      Cart.showToast('Selected fragrance not found');
      return;
    }

    const orderNum = 'PRE-2026-' + Math.floor(1000 + Math.random() * 9000);
    const awb = 'BD-' + Math.floor(10000000 + Math.random() * 90000000);
    const itemTotal = product.price * qty;
    const shipping = itemTotal >= 999 ? 0 : 99;
    const grandTotal = itemTotal + shipping;

    const now = new Date();
    const etaDate = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
    const etaStr = 'Batch 01 Dispatch: ' + etaDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const newOrder = {
      orderId: orderNum,
      awb: awb,
      createdAt: now.toISOString(),
      eta: etaStr,
      status: 'Pre-Order Confirmed',
      statusClass: 'confirmed',
      statusText: 'Limited Batch 01 Reserved — Maceration & Maturation in Kannauj',
      courier: courier,
      stepIndex: 1,
      recipient: {
        name: name,
        phone: phone,
        email: email,
        address: address,
        city: city,
        state: state,
        pin: pin
      },
      items: [
        {
          name: product.name,
          size: product.size,
          price: product.price,
          qty: qty,
          image: product.image
        }
      ],
      subtotal: itemTotal,
      discount: 0,
      shipping: shipping,
      total: grandTotal,
      paymentMethod: paymentMethod.toUpperCase(),
      paymentStatus: paymentMethod === 'COD' ? 'Pending upon Delivery' : 'Paid & Allocation Confirmed',
      logs: [
        { status: 'Pre-Order Reserved & Batch 01 Slot Allocated', time: 'Just now', hub: 'Aavasa Operations Central', latest: true },
        { status: 'Passed Longevity Gas Chromatography Standard', time: 'Lab Queue Active', hub: 'Kannauj Master Perfumery Lab' },
        { status: 'Priority Air Express AWB Generated', time: 'Tracking Active', hub: 'BlueDart Air Express' }
      ]
    };

    if (typeof Tracker !== 'undefined') {
      Tracker.saveOrder(newOrder);
    }

    closeNewOrderModal();
    refreshDashboard();
    Cart.showToast(`✨ Pre-Order ${orderNum} created successfully!`, 'green');
  }

  /* -----------------------------------------------------------------------------
     8. EXPORT CSV REPORT
     ----------------------------------------------------------------------------- */
  function exportCSV() {
    const orders = typeof Tracker !== 'undefined' ? Tracker.getStoredOrders() : [];
    if (orders.length === 0) {
      Cart.showToast('No pre-orders to export');
      return;
    }

    const headers = [
      'Order ID',
      'Created Date',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Delivery Address',
      'City',
      'State',
      'PIN',
      'Items Summary',
      'Subtotal (INR)',
      'Discount (INR)',
      'Shipping (INR)',
      'Grand Total (INR)',
      'Payment Method',
      'Payment Status',
      'Fulfillment Status',
      'Courier Partner',
      'AWB Number',
      'Estimated Dispatch / ETA'
    ];

    const rows = orders.map(o => {
      const itemsStr = (o.items || []).map(i => `${i.name} (x${i.qty})`).join('; ');
      return [
        o.orderId,
        o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN') : '',
        o.recipient?.name || '',
        o.recipient?.phone || '',
        o.recipient?.email || '',
        (o.recipient?.address || '').replace(/,/g, ' '),
        o.recipient?.city || '',
        o.recipient?.state || '',
        o.recipient?.pin || '',
        itemsStr.replace(/,/g, ' '),
        o.subtotal || 0,
        o.discount || 0,
        o.shipping || 0,
        o.total || 0,
        o.paymentMethod || '',
        o.paymentStatus || '',
        o.status || '',
        o.courier || '',
        o.awb || '',
        o.eta || ''
      ].map(val => `"${val}"`).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `AAVASA_PreOrders_Fulfillment_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Cart.showToast('CSV report downloaded successfully!', 'green');
  }

  /* -----------------------------------------------------------------------------
     9. RESET DEMO DATA
     ----------------------------------------------------------------------------- */
  function resetDemoData() {
    if (confirm('Are you sure you want to reset all pre-order data to the default demo state? Custom orders will be refreshed.')) {
      if (typeof Tracker !== 'undefined') {
        Tracker.resetDemoOrders();
      }
      refreshDashboard();
      Cart.showToast('Dataset reset to default demo pre-orders', 'green');
    }
  }

  /* -----------------------------------------------------------------------------
     10. DELETE ORDER
     ----------------------------------------------------------------------------- */
  function deleteOrder(orderId) {
    if (confirm(`Are you sure you want to delete pre-order ${orderId}? This cannot be undone.`)) {
      if (typeof Tracker !== 'undefined') {
        Tracker.deleteOrder(orderId);
      }
      refreshDashboard();
      Cart.showToast(`Pre-Order ${orderId} deleted.`);
    }
  }

  /* -----------------------------------------------------------------------------
     11. EVENT LISTENERS
     ----------------------------------------------------------------------------- */
  function attachEventListeners() {
    // PIN Lock Form
    const pinForm = document.getElementById('adminPinForm');
    if (pinForm) pinForm.addEventListener('submit', handlePinSubmit);

    const lockBtn = document.getElementById('adminLockBtn');
    if (lockBtn) lockBtn.addEventListener('click', lockPortal);

    // Search Input
    const searchInput = document.getElementById('adminSearchInput');
    const clearSearchBtn = document.getElementById('adminClearSearchBtn');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        currentSearchQuery = searchInput.value.trim();
        if (clearSearchBtn) {
          clearSearchBtn.classList.toggle('active', currentSearchQuery.length > 0);
        }
        renderTable();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.classList.remove('active');
        renderTable();
      });
    }

    // Filter selects
    const statusFilter = document.getElementById('adminStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        currentStatusFilter = e.target.value;
        renderTable();
      });
    }

    const paymentFilter = document.getElementById('adminPaymentFilter');
    if (paymentFilter) {
      paymentFilter.addEventListener('change', (e) => {
        currentPaymentFilter = e.target.value;
        renderTable();
      });
    }

    const sortSelect = document.getElementById('adminSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderTable();
      });
    }

    // Modal Triggers
    const openNewBtn = document.getElementById('openNewOrderModalBtn');
    if (openNewBtn) openNewBtn.addEventListener('click', openNewOrderModal);

    const closeNewBtn = document.getElementById('closeNewOrderModalBtn');
    if (closeNewBtn) closeNewBtn.addEventListener('click', closeNewOrderModal);

    const cancelNewBtn = document.getElementById('cancelNewOrderBtn');
    if (cancelNewBtn) cancelNewBtn.addEventListener('click', closeNewOrderModal);

    const newOrderForm = document.getElementById('adminNewOrderForm');
    if (newOrderForm) newOrderForm.addEventListener('submit', handleCreateNewOrder);

    // Detail Modal actions
    const closeDetailBtn = document.getElementById('closeDetailModalBtn');
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetailModal);

    const printDetailInvoiceBtn = document.getElementById('printDetailInvoiceBtn');
    if (printDetailInvoiceBtn) {
      printDetailInvoiceBtn.addEventListener('click', () => {
        if (activeDetailOrder && typeof Tracker !== 'undefined') {
          Tracker.openInvoice(activeDetailOrder);
        }
      });
    }

    const openEditFromDetailBtn = document.getElementById('openEditFromDetailBtn');
    if (openEditFromDetailBtn) {
      openEditFromDetailBtn.addEventListener('click', () => {
        if (activeDetailOrder) {
          openStatusModal(activeDetailOrder.orderId);
        }
      });
    }

    // Status Update Modal actions
    const closeStatusBtn = document.getElementById('closeStatusModalBtn');
    if (closeStatusBtn) closeStatusBtn.addEventListener('click', closeStatusModal);

    const cancelStatusBtn = document.getElementById('cancelStatusBtn');
    if (cancelStatusBtn) cancelStatusBtn.addEventListener('click', closeStatusModal);

    const statusForm = document.getElementById('adminUpdateStatusForm');
    if (statusForm) statusForm.addEventListener('submit', handleStatusUpdate);

    // Export CSV & Reset
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportCSV);

    const resetBtn = document.getElementById('adminResetDemoBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetDemoData);

    // Table Row Action Buttons (Delegated)
    const tableBody = document.getElementById('adminOrdersTableBody');
    if (tableBody) {
      tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const orderId = btn.dataset.orderid;

        if (action === 'view') {
          openDetailModal(orderId);
        } else if (action === 'edit') {
          openStatusModal(orderId);
        } else if (action === 'invoice') {
          const orders = typeof Tracker !== 'undefined' ? Tracker.getStoredOrders() : [];
          const o = orders.find(item => item.orderId === orderId);
          if (o && typeof Tracker !== 'undefined') {
            Tracker.openInvoice(o);
          }
        } else if (action === 'delete') {
          deleteOrder(orderId);
        }
      });
    }
  }

  return {
    init,
    refreshDashboard,
    openStatusModal,
    openDetailModal,
    exportCSV
  };
})();

document.addEventListener('DOMContentLoaded', Admin.init);
