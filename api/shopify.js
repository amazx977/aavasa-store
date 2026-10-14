/**
 * Vercel Serverless Function: Shopify Integration Engine
 * Connects AAVASA with uncvcs-tv.myshopify.com
 * Handles OAuth token exchange, order creation, and live inventory sync.
 */

const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP || 'uncvcs-tv.myshopify.com';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || 'e2224f0e02650fd54bf2f15bdabd4217';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const SHOPIFY_API_VERSION = '2024-10';

export default async function handler(req, res) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, x-shopify-token'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const host = req.headers.host || 'aavasa-store.vercel.app';
  const url = new URL(req.url, `https://${host}`);
  const action = url.searchParams.get('action') || (req.method === 'GET' ? 'status' : 'sync-order');

  // 1. GENERATE OAUTH INSTALL URL
  if (action === 'auth-url') {
    const scopes = 'read_products,write_products,read_orders,write_orders,read_inventory';
    const redirectUri = `https://${host}`;
    const authUrl = `https://${SHOPIFY_SHOP}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return res.status(200).json({
      success: true,
      shop: SHOPIFY_SHOP,
      clientId: SHOPIFY_CLIENT_ID,
      authUrl: authUrl
    });
  }

  // 2. EXCHANGE OAUTH CODE FOR PERMANENT ACCESS TOKEN
  if (action === 'exchange-token') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    const code = body.code || url.searchParams.get('code');
    const shop = body.shop || url.searchParams.get('shop') || SHOPIFY_SHOP;

    if (!code) {
      return res.status(400).json({ success: false, error: 'OAuth authorization code is required' });
    }

    try {
      const tokenResp = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: SHOPIFY_CLIENT_ID,
          client_secret: SHOPIFY_CLIENT_SECRET || req.headers['x-shopify-client-secret'] || body.clientSecret,
          code: code
        })
      });

      const tokenData = await tokenResp.json();
      if (!tokenResp.ok) {
        return res.status(tokenResp.status).json({ success: false, error: tokenData });
      }

      return res.status(200).json({
        success: true,
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
        shop: shop
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // 3. CREATE ORDER IN SHOPIFY ADMIN
  if (action === 'sync-order' || req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    const orderData = body.order || body;
    const token = req.headers['x-shopify-token'] || body.shopifyToken || process.env.SHOPIFY_ACCESS_TOKEN;

    if (!token) {
      return res.status(200).json({
        success: false,
        requiresToken: true,
        message: 'Shopify token not connected yet. Please authorize the app.'
      });
    }

    try {
      // Map fragrance items to Shopify line items
      const lineItems = (orderData.items || []).map(item => ({
        title: item.name || 'AAVASA Luxury Perfume',
        price: (item.price || 799).toString(),
        quantity: Number(item.qty || 1)
      }));

      const cust = orderData.customer || {};
      const nameParts = (cust.name || 'AAVASA Customer').trim().split(' ');
      const firstName = nameParts[0] || 'AAVASA';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';

      const isCod = (orderData.paymentMethod || '').toLowerCase().includes('cod');

      const shopifyPayload = {
        order: {
          line_items: lineItems.length > 0 ? lineItems : [
            { title: 'Adore Eau De Parfum 100ml', price: '799.00', quantity: 1 }
          ],
          customer: {
            first_name: firstName,
            last_name: lastName,
            email: cust.email || 'customer@example.com',
            phone: cust.phone || ''
          },
          shipping_address: {
            first_name: firstName,
            last_name: lastName,
            address1: cust.address || 'Doorstep Delivery Address',
            city: cust.city || 'Mumbai',
            province: cust.state || 'Maharashtra',
            country: 'India',
            zip: cust.pin || '400001',
            phone: cust.phone || ''
          },
          financial_status: isCod ? 'pending' : 'paid',
          tags: 'AAVASA_PREORDER, BATCH_01, 6_HOUR_LONGEVITY',
          note: `Pre-Order Ref: ${orderData.orderId || 'PRE-2026'} | BlueDart AWB: ${orderData.awb || 'N/A'} | Payment Ref: ${orderData.paymentId || 'N/A'}`
        }
      };

      const shopResp = await fetch(`https://${SHOPIFY_SHOP}/admin/api/${SHOPIFY_API_VERSION}/orders.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token
        },
        body: JSON.stringify(shopifyPayload)
      });

      const shopResult = await shopResp.json();
      if (!shopResp.ok) {
        return res.status(shopResp.status).json({ success: false, error: shopResult });
      }

      return res.status(200).json({
        success: true,
        shopifyOrderId: shopResult.order?.id,
        shopifyOrderNumber: shopResult.order?.order_number,
        shopifyOrderName: shopResult.order?.name,
        shopifyAdminUrl: `https://${SHOPIFY_SHOP}/admin/orders/${shopResult.order?.id}`
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // 4. STATUS / HEALTH
  return res.status(200).json({
    status: 'ready',
    shop: SHOPIFY_SHOP,
    clientId: SHOPIFY_CLIENT_ID,
    apiVersion: SHOPIFY_API_VERSION,
    hasSecret: Boolean(SHOPIFY_CLIENT_SECRET)
  });
}
