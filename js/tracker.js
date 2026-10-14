/**
 * AAVASA / The Bold Rose Luxury Perfumes
 * Order Tracking Engine & Real-Time Courier Stepper
 */

const Tracker = (function () {
  const ORDERS_STORAGE_KEY = 'aavasa_tracked_orders';

  // Seed realistic demo orders for testing & demonstration
  const DEFAULT_DEMO_ORDERS = [
    {
      orderId: 'PRE-2026-7842',
      awb: 'BD-88492019',
      createdAt: '2026-10-12T09:30:00Z',
      eta: 'Today by 6:00 PM',
      status: 'Out for Delivery',
      statusClass: 'out-delivery',
      statusText: 'Out with BlueDart Delivery Agent (Arun Kumar)',
      courier: 'BlueDart Air Express',
      stepIndex: 4, // 1 to 5
      recipient: {
        name: 'Priya Sharma',
        phone: '+91 98201 44521',
        email: 'priya.sharma@gmail.com',
        address: 'B-402, Sea Green Heights, Worli',
        city: 'Mumbai',
        state: 'Maharashtra',
        pin: '400018'
      },
      items: [
        {
          name: 'Adore Eau De Parfum',
          size: '60 ml / 2.0 fl. oz.',
          price: 799,
          qty: 1,
          image: 'media/Adore.png'
        },
        {
          name: 'Discovery Trial Pack | 3 x 10ml',
          size: '3 x 10 ml Spray Vials',
          price: 299,
          qty: 1,
          image: 'media/Dset 1.png'
        }
      ],
      subtotal: 1098,
      discount: 100,
      shipping: 0,
      total: 998,
      paymentMethod: 'UPI (GPAY)',
      paymentStatus: 'Paid & Verified',
      logs: [
        { status: 'Out for Delivery — Delivery associate is on route to your location', time: 'Today, 09:15 AM', hub: 'South Mumbai Central Delivery Hub', latest: true },
        { status: 'Arrived at Mumbai Courier Air Cargo Terminal', time: 'Yesterday, 11:40 PM', hub: 'Chhatrapati Shivaji Maharaj Cargo Terminal' },
        { status: 'Dispatched from Kannauj Master Perfumery Facility via Air Freight', time: 'Oct 13, 03:20 PM', hub: 'Lucknow Air Cargo Hub' },
        { status: 'Quality Lab Check Passed (6+ Hour Gas Chromatography Standard)', time: 'Oct 12, 02:15 PM', hub: 'Aavasa Quality Assurance Lab' },
        { status: 'Pre-Order Confirmed & Velvet Crushproof Pack Sealed', time: 'Oct 12, 09:30 AM', hub: 'Aavasa Digital Gateway' }
      ]
    },
    {
      orderId: 'PRE-2026-5510',
      awb: 'DEL-41092841',
      createdAt: '2026-10-13T14:15:00Z',
      eta: 'Tomorrow, Oct 15',
      status: 'In Transit',
      statusClass: 'in-transit',
      statusText: 'In Transit — Departed Distribution Hub',
      courier: 'Delhivery Air Express',
      stepIndex: 3,
      recipient: {
        name: 'Arjun Mehta',
        phone: '+91 99450 12893',
        email: 'arjun.mehta@yahoo.com',
        address: 'Villa 12, Palm Meadows, Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        pin: '560066'
      },
      items: [
        {
          name: 'Night Oud Eau De Parfum',
          size: '60 ml / 2.0 fl. oz.',
          price: 899,
          qty: 1,
          image: 'media/Night.png'
        },
        {
          name: 'Dusky Rose Eau De Parfum',
          size: '60 ml / 2.0 fl. oz.',
          price: 849,
          qty: 1,
          image: 'media/Dusky Rose.png'
        }
      ],
      subtotal: 1748,
      discount: 262,
      shipping: 0,
      total: 1486,
      paymentMethod: 'VISA CREDIT CARD',
      paymentStatus: 'Paid & Verified',
      logs: [
        { status: 'In Transit to Kempegowda Bengaluru Hub', time: 'Oct 14, 06:30 AM', hub: 'Delhi Transit Sorting Facility', latest: true },
        { status: 'Dispatched from Central Perfumery Fulfillment Hub', time: 'Oct 13, 08:00 PM', hub: 'Aavasa Hub Kannauj' },
        { status: 'Fragrance Matured & Batch Inspected', time: 'Oct 13, 04:30 PM', hub: 'Kannauj Lab' },
        { status: 'Pre-Order Verified', time: 'Oct 13, 02:15 PM', hub: 'Aavasa Online' }
      ]
    },
    {
      orderId: 'PRE-2026-3199',
      awb: 'BD-77192840',
      createdAt: '2026-10-10T11:00:00Z',
      eta: 'Delivered on Oct 13',
      status: 'Delivered',
      statusClass: 'delivered',
      statusText: 'Delivered to Customer (Signed by Ananya V.)',
      courier: 'BlueDart Air Express',
      stepIndex: 5,
      recipient: {
        name: 'Ananya Verma',
        phone: '+91 98111 67234',
        email: 'ananya.v@gmail.com',
        address: '42, Vasant Vihar, Block C',
        city: 'New Delhi',
        state: 'Delhi',
        pin: '110057'
      },
      items: [
        {
          name: 'The Master Discovery Coffret | 5 x 10ml',
          size: '5 x 10 ml Deluxe Sprays',
          price: 499,
          qty: 1,
          image: 'media/Sample set 1.png'
        },
        {
          name: 'Morning Shower Eau De Parfum',
          size: '60 ml / 2.0 fl. oz.',
          price: 749,
          qty: 1,
          image: 'media/Morning Shower.png'
        }
      ],
      subtotal: 1248,
      discount: 125,
      shipping: 0,
      total: 1123,
      paymentMethod: 'CASH ON DELIVERY',
      paymentStatus: 'Paid Upon Delivery (₹1,123)',
      logs: [
        { status: 'Delivered — Package handed over to recipient with receipt', time: 'Oct 13, 01:45 PM', hub: 'New Delhi Delivery Post', latest: true },
        { status: 'Out for Delivery', time: 'Oct 13, 09:30 AM', hub: 'Vasant Vihar Hub' },
        { status: 'Arrived at Indira Gandhi Cargo Terminal', time: 'Oct 12, 07:15 PM', hub: 'Delhi Terminal' },
        { status: 'Dispatched via Air Express', time: 'Oct 11, 04:00 PM', hub: 'BlueDart Hub' },
        { status: 'Pre-Order Processed & Handcrafted', time: 'Oct 10, 11:00 AM', hub: 'Aavasa Labs' }
      ]
    },
    {
      orderId: 'PRE-2026-9214',
      awb: 'BD-99214820',
      createdAt: '2026-10-14T11:00:00Z',
      eta: 'Batch 01 Dispatch: Oct 20',
      status: 'Pre-Order Confirmed',
      statusClass: 'confirmed',
      statusText: 'Limited Batch 01 Reserved — Maceration & Maturation in Kannauj',
      courier: 'BlueDart Air Express (Priority)',
      stepIndex: 1,
      recipient: {
        name: 'Rohan Deshmukh',
        phone: '+91 97654 32109',
        email: 'rohan.deshmukh@outlook.com',
        address: 'Flat 804, Marvel Zephyr, Kharadi',
        city: 'Pune',
        state: 'Maharashtra',
        pin: '411014'
      },
      items: [
        {
          name: 'Euphoria Eau De Parfum',
          size: '60 ml / 2.0 fl. oz.',
          price: 849,
          qty: 1,
          image: 'media/Euphoria.png'
        }
      ],
      subtotal: 849,
      discount: 0,
      shipping: 99,
      total: 948,
      paymentMethod: 'UPI (PHONEPE)',
      paymentStatus: 'Paid & Allocation Confirmed',
      logs: [
        { status: 'Pre-Order Reserved & Batch 01 Slot Allocated', time: 'Today, 11:00 AM', hub: 'Aavasa Digital Gateway', latest: true },
        { status: 'Passed Longevity Gas Chromatography Standard', time: 'Lab Queue Active', hub: 'Kannauj Master Perfumery Lab' },
        { status: 'Velvet Cushioning & Crushproof Box Assembly', time: 'Scheduled for Batch Dispatch', hub: 'Aavasa Fulfillment Central' },
        { status: 'Priority Air Express AWB Generated', time: 'Tracking Active', hub: 'BlueDart Air Express' }
      ]
    }
  ];

  function getStoredOrders() {
    try {
      const data = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error parsing stored orders', e);
    }
    // Seed default demo orders
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_ORDERS));
    return DEFAULT_DEMO_ORDERS;
  }

  function saveOrder(order) {
    const orders = getStoredOrders();
    orders.unshift(order);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }

  function updateOrder(orderId, updates) {
    const orders = getStoredOrders();
    const idx = orders.findIndex(o => o.orderId === orderId);
    if (idx > -1) {
      orders[idx] = { ...orders[idx], ...updates };
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
      return orders[idx];
    }
    return null;
  }

  function deleteOrder(orderId) {
    let orders = getStoredOrders();
    orders = orders.filter(o => o.orderId !== orderId);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    return true;
  }

  function resetDemoOrders() {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_ORDERS));
    return DEFAULT_DEMO_ORDERS;
  }

  function findOrder(query) {
    const cleanQuery = (query || '').trim().toLowerCase();
    if (!cleanQuery) return null;

    const orders = getStoredOrders();
    const cleanDigits = cleanQuery.replace(/\D/g, '');

    return orders.find(o => {
      const orderIdLower = (o.orderId || '').toLowerCase();
      const orderDigits = orderIdLower.replace(/\D/g, '');
      const awbLower = (o.awb || '').toLowerCase();
      const phoneDigits = (o.recipient && o.recipient.phone ? o.recipient.phone.replace(/\D/g, '') : '');
      const emailLower = (o.recipient && o.recipient.email ? o.recipient.email.toLowerCase() : '');

      return orderIdLower === cleanQuery ||
             (cleanDigits && orderDigits.endsWith(cleanDigits)) ||
             awbLower === cleanQuery ||
             (cleanDigits.length >= 4 && phoneDigits.includes(cleanDigits)) ||
             emailLower === cleanQuery;
    });
  }

  function trackOrder(query) {
    const order = findOrder(query);
    const resultArea = document.getElementById('trackingResultArea');
    const inputEl = document.getElementById('trackerSearchInput');

    if (!resultArea) return;

    if (!order) {
      if (typeof Cart !== 'undefined') {
        Cart.showToast(`No order found for "${query}". Try demo order #AAV-2026-7842`);
      }
      return;
    }

    if (inputEl) inputEl.value = order.orderId;
    renderTrackingDetails(order);
    resultArea.classList.add('active');
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderTrackingDetails(order) {
    // Header
    const orderIdEl = document.getElementById('trackOrderIdTitle');
    const awbEl = document.getElementById('trackAwbCode');
    const etaEl = document.getElementById('trackEtaDisplay');
    const courierEl = document.getElementById('trackCourierName');
    const statusBadgeEl = document.getElementById('trackStatusBadge');

    if (orderIdEl) orderIdEl.textContent = `Order ${order.orderId}`;
    if (awbEl) awbEl.textContent = order.awb;
    if (etaEl) etaEl.textContent = order.eta;
    if (courierEl) courierEl.textContent = order.courier;
    if (statusBadgeEl) {
      statusBadgeEl.textContent = order.status;
      statusBadgeEl.className = `tracking-status-badge ${order.statusClass || 'in-transit'}`;
    }

    // Stepper (5 Nodes)
    const stepIdx = order.stepIndex || (order.status === 'Delivered' ? 5 : order.status === 'Out for Delivery' ? 4 : 3);
    const nodes = document.querySelectorAll('.stepper-node');
    nodes.forEach((node, idx) => {
      const nodeNum = idx + 1;
      node.classList.remove('completed', 'active');
      if (nodeNum < stepIdx) {
        node.classList.add('completed');
      } else if (nodeNum === stepIdx) {
        node.classList.add(nodeNum === 5 ? 'completed' : 'active');
      }
    });

    const progressFill = document.getElementById('stepperProgressFill');
    if (progressFill) {
      const percent = Math.min(100, Math.max(0, ((stepIdx - 1) / 4) * 100));
      progressFill.style.width = `${percent}%`;
    }

    // Timeline Logs
    const logsListEl = document.getElementById('trackingLogsList');
    if (logsListEl) {
      logsListEl.innerHTML = (order.logs || []).map((log, idx) => `
        <div class="log-entry ${idx === 0 ? 'latest' : ''}">
          <div class="log-status">${log.status}</div>
          <div class="log-meta">${log.time} • ${log.hub}</div>
        </div>
      `).join('');
    }

    // Package Items List
    const itemsListEl = document.getElementById('trackingPackageItems');
    if (itemsListEl) {
      itemsListEl.innerHTML = (order.items || []).map(item => `
        <div class="tracking-item-row">
          <img src="${item.image}" alt="${item.name}">
          <div class="tracking-item-info" style="flex: 1;">
            <h5>${item.name}</h5>
            <span>${item.size} • Qty: ${item.qty}</span>
          </div>
          <div style="font-weight: 700; color: var(--c-choco-800);">
            ₹${(item.price * item.qty).toLocaleString('en-IN')}
          </div>
        </div>
      `).join('');
    }

    // Recipient & Payment Box
    const addressBoxEl = document.getElementById('trackingAddressBox');
    if (addressBoxEl && order.recipient) {
      addressBoxEl.innerHTML = `
        <div style="font-weight: 700; color: var(--c-choco-800); margin-bottom: 4px;">Delivering to:</div>
        <div><strong>${order.recipient.name}</strong> • ${order.recipient.phone}</div>
        <div>${order.recipient.address}, ${order.recipient.city}, ${order.recipient.state} - ${order.recipient.pin}</div>
        <div style="margin-top: 10px; display: flex; align-items: center; gap: 8px;">
          <span class="badge badge-green">${order.paymentStatus || 'Payment Verified'}</span>
          <span style="font-size: 0.8rem; color: var(--c-choco-500);">via ${order.paymentMethod || 'UPI'}</span>
        </div>
      `;
    }

    // Invoice button attachment
    const invoiceBtn = document.getElementById('openInvoiceBtn');
    if (invoiceBtn) {
      invoiceBtn.onclick = () => openInvoice(order);
    }
  }

  function copyAwb() {
    const awb = document.getElementById('trackAwbCode')?.textContent;
    if (awb && navigator.clipboard) {
      navigator.clipboard.writeText(awb).then(() => {
        if (typeof Cart !== 'undefined') {
          Cart.showToast(`AWB ${awb} copied to clipboard!`, 'green');
        }
      });
    }
  }

  function openInvoice(order) {
    let overlay = document.getElementById('invoiceOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'invoiceOverlay';
      overlay.className = 'invoice-overlay';
      document.body.appendChild(overlay);
    }

    const itemsRows = (order.items || []).map(item => `
      <tr>
        <td>${item.name} (${item.size})</td>
        <td>₹${item.price.toLocaleString('en-IN')}</td>
        <td>${item.qty}</td>
        <td style="text-align: right;">₹${(item.price * item.qty).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    overlay.innerHTML = `
      <div class="invoice-modal">
        <button class="modal-close-btn" onclick="Tracker.closeInvoice()">✕</button>
        <div class="invoice-header">
          <div>
            <div class="invoice-title">AAVASA PERFUMES</div>
            <div style="font-size: 0.82rem; color: #555;">6+ Hour Performance Perfumery India</div>
            <div style="font-size: 0.82rem; color: #555;">GSTIN: 27AABCT8921K1ZP • IFRA Certified</div>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0; color: var(--c-orange-600);">TAX INVOICE</h3>
            <div style="font-size: 0.86rem; font-weight: bold;">#INV-${order.orderId}</div>
            <div style="font-size: 0.8rem; color: #666;">Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 0.88rem; margin-bottom: 20px;">
          <div>
            <strong>Billed & Shipped To:</strong>
            <div>${order.recipient?.name || 'Customer'}</div>
            <div>${order.recipient?.address || ''}</div>
            <div>${order.recipient?.city || ''}, ${order.recipient?.state || ''} - ${order.recipient?.pin || ''}</div>
            <div>Phone: ${order.recipient?.phone || ''}</div>
          </div>
          <div style="text-align: right;">
            <strong>Logistics Details:</strong>
            <div>Courier: ${order.courier}</div>
            <div>AWB: ${order.awb}</div>
            <div>Status: ${order.status}</div>
            <div>Payment: ${order.paymentMethod} (${order.paymentStatus})</div>
          </div>
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th>Fragrance Item</th>
              <th>Unit Price</th>
              <th>Qty</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="margin-left: auto; max-width: 260px; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Subtotal:</span>
            <span>₹${(order.subtotal || 0).toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: var(--c-green-700);">
            <span>Discount:</span>
            <span>-₹${(order.discount || 0).toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Express Shipping:</span>
            <span>${order.shipping === 0 ? 'FREE' : '₹' + order.shipping}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.15rem; border-top: 2px solid #222; padding-top: 6px;">
            <span>Grand Total:</span>
            <span style="color: var(--c-orange-600);">₹${(order.total || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div style="margin-top: 30px; padding-top: 16px; border-top: 1px dashed #ccc; text-align: center; font-size: 0.8rem; color: #777;">
          Thank you for choosing AAVASA Perfumes. 30-Day Money Back Guarantee on all 6+ hour longevity claims.
          <br>For assistance: care@aavasaperfumes.com | WhatsApp: +91 98200 12345
        </div>

        <div style="margin-top: 20px; text-align: center;">
          <button class="btn btn-primary btn-sm" onclick="window.print()">🖨️ Print Invoice</button>
        </div>
      </div>
    `;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeInvoice() {
    const overlay = document.getElementById('invoiceOverlay');
    if (overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // Bind UI elements
  document.addEventListener('DOMContentLoaded', () => {
    // Seed initial demo orders in memory
    getStoredOrders();

    const searchForm = document.getElementById('trackerSearchForm');
    const searchInput = document.getElementById('trackerSearchInput');

    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (searchInput) trackOrder(searchInput.value);
      });
    }

    // Demo chip click handlers
    document.querySelectorAll('.demo-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.orderid;
        if (orderId) trackOrder(orderId);
      });
    });

    const copyBtn = document.getElementById('copyAwbBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', copyAwb);
    }

    // Auto-load demo order if on dedicated track.html page or if requested via URL param
    if (window.location.pathname.includes('track') || window.location.search.includes('track')) {
      const urlParams = new URLSearchParams(window.location.search);
      const queryOrder = urlParams.get('id') || 'PRE-2026-7842';
      setTimeout(() => trackOrder(queryOrder), 150);
    }

    // Connect cart drawer triggers if present on tracking page
    document.querySelectorAll('.cart-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof Cart !== 'undefined') Cart.openDrawer();
      });
    });
  });

  return {
    getStoredOrders,
    saveOrder,
    updateOrder,
    deleteOrder,
    resetDemoOrders,
    findOrder,
    trackOrder,
    copyAwb,
    openInvoice,
    closeInvoice
  };
})();
