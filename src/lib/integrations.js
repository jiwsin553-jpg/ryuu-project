import { appConfig, integrations } from './config';

const postJson = async (url, payload) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Falha na integração.');
  }

  return data;
};

export const createStripeCheckout = (payload) => postJson(appConfig.stripe.checkoutEndpoint, payload);

export const createMercadoPagoPayment = (payload) => postJson(appConfig.mercadoPago.paymentEndpoint, payload);

export const notifyDiscordOrder = async (payload) => {
  if (!integrations.discordWebhook) return null;
  return postJson(appConfig.discord.webhookEndpoint, payload);
};

export const notifyEmailOrder = async (payload) => {
  if (!integrations.email) return null;
  return postJson(appConfig.email.endpoint, payload);
};
