import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const port = Number(process.env.PORT || 3001);
const mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const mercadoPagoWebhookUrl = process.env.MERCADO_PAGO_WEBHOOK_URL || '';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const allowedOrigins = (process.env.CORS_ORIGIN || 'https://ryuucheatsbr.dev')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const getCorsOrigin = (request) => {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.includes(origin)) return origin;
  return allowedOrigins[0] || '*';
};

const sendJson = (request, response, statusCode, data) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-signature,x-request-id',
  });
  response.end(JSON.stringify(data));
};

const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
};

const postMercadoPago = async (path, payload) => {
  if (!mercadoPagoAccessToken) throw new Error('MERCADO_PAGO_ACCESS_TOKEN nao configurado.');

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mercadoPagoAccessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Falha no Mercado Pago.');
  return data;
};

const getMercadoPago = async (path) => {
  if (!mercadoPagoAccessToken) throw new Error('MERCADO_PAGO_ACCESS_TOKEN nao configurado.');

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    headers: {
      Authorization: `Bearer ${mercadoPagoAccessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Falha no Mercado Pago.');
  return data;
};

const updateOrderStatus = async (orderId, status, paymentProviderId) => {
  if (!supabaseUrl || !supabaseServiceRoleKey || !orderId) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
    method: 'PATCH',
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      status,
      payment_provider_id: String(paymentProviderId || ''),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Falha ao atualizar pedido.');
  return data;
};

const toOrderStatus = (paymentStatus) => {
  if (paymentStatus === 'approved') return 'Aguardando Envio';
  if (paymentStatus === 'pending' || paymentStatus === 'in_process') return 'Aguardando Pagamento';
  return 'Aguardando Pagamento';
};

const handlePayment = async (request, response) => {
  const body = await readJson(request);
  const payment = body.payment || {};

  const mpPayload = {
    transaction_amount: Number(body.total || payment.transaction_amount || 0),
    token: payment.token,
    description: `Ryuu Cheats - pedido ${body.orderId}`,
    installments: Number(payment.installments || 1),
    payment_method_id: payment.payment_method_id,
    issuer_id: payment.issuer_id,
    external_reference: body.orderId,
    notification_url: mercadoPagoWebhookUrl || undefined,
    payer: {
      email: payment.payer?.email || body.customer?.email,
      identification: payment.payer?.identification,
      first_name: body.customer?.name,
    },
    metadata: {
      order_id: body.orderId,
      discord: body.customer?.discord,
      coupon: body.coupon,
    },
  };

  Object.keys(mpPayload).forEach((key) => mpPayload[key] === undefined && delete mpPayload[key]);

  const mpPayment = await postMercadoPago('/v1/payments', mpPayload);
  await updateOrderStatus(body.orderId, toOrderStatus(mpPayment.status), mpPayment.id);

  sendJson(request, response, 200, {
    id: mpPayment.id,
    status: mpPayment.status,
    status_detail: mpPayment.status_detail,
    payment_method_id: mpPayment.payment_method_id,
    point_of_interaction: mpPayment.point_of_interaction,
  });
};

const handleWebhook = async (request, response, url) => {
  const body = await readJson(request);
  const paymentId = body?.data?.id || body?.id || url.searchParams.get('data.id') || url.searchParams.get('id');

  if (!paymentId) {
    sendJson(request, response, 200, { received: true });
    return;
  }

  const payment = await getMercadoPago(`/v1/payments/${paymentId}`);
  await updateOrderStatus(payment.external_reference, toOrderStatus(payment.status), payment.id);

  sendJson(request, response, 200, { received: true });
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') {
      sendJson(request, response, 204, {});
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(request, response, 200, { ok: true });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/mercadopago/payment') {
      await handlePayment(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/mercadopago/webhook') {
      await handleWebhook(request, response, url);
      return;
    }

    sendJson(request, response, 404, { error: 'Rota nao encontrada.' });
  } catch (error) {
    sendJson(request, response, 500, { error: error.message || 'Erro interno.' });
  }
});

server.listen(port, () => {
  console.log(`Ryuu API rodando na porta ${port}`);
});
