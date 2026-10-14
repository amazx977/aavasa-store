/**
 * ============================================================================
 * BACKEND CONFIGURATION: RAZORPAY MERCHANT CREDENTIALS
 * You can set these directly below, or via Vercel Environment Variables:
 * RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 * ============================================================================
 */
const BACKEND_RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const BACKEND_RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

/**
 * Vercel Serverless Function: Create Razorpay Order
 * Securely creates a server-side order with Razorpay API (POST https://api.razorpay.com/v1/orders)
 * Uses native fetch (Node 18+). Zero external npm dependencies.
 */
export default async function handler(req, res) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-razorpay-key-id, x-razorpay-key-secret'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_live_Tnq1aTNzuxqpok';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  // Allow GET request to check gateway health/status
  if (req.method === 'GET') {
    const isConfigured = Boolean(keyId && keySecret);
    return res.status(200).json({
      status: 'active',
      configured: isConfigured,
      keyId: keyId
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    const amount = Number(body.amount);
    const currency = body.currency || 'INR';
    const receipt = body.receipt || `rcpt_${Date.now()}`;
    const notes = body.notes || {};

    // Keys resolved from backend config, environment variables, or secure admin headers
    const keyId = BACKEND_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || req.headers['x-razorpay-key-id'] || body.keyId;
    const keySecret = BACKEND_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || req.headers['x-razorpay-key-secret'] || body.keySecret;

    if (!keyId || !keySecret) {
      return res.status(200).json({
        success: false,
        requiresConfiguration: true,
        message: 'No Razorpay Key ID or Secret configured in backend.'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        currency,
        receipt,
        notes
      })
    });

    const rzpData = await rzpResponse.json();

    if (!rzpResponse.ok) {
      return res.status(rzpResponse.status).json({
        success: false,
        error: rzpData.error ? rzpData.error.description : 'Failed to create order on Razorpay',
        details: rzpData
      });
    }

    return res.status(200).json({
      success: true,
      order: rzpData,
      keyId: keyId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while contacting Razorpay API'
    });
  }
}
