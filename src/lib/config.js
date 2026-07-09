const env = import.meta.env;

export const appConfig = {
  supabase: {
    url: env.VITE_SUPABASE_URL || '',
    anonKey: env.VITE_SUPABASE_ANON_KEY || '',
  },
  stripe: {
    publicKey: env.VITE_STRIPE_PUBLIC_KEY || '',
    checkoutEndpoint: env.VITE_STRIPE_CHECKOUT_ENDPOINT || '',
  },
  mercadoPago: {
    publicKey: env.VITE_MERCADO_PAGO_PUBLIC_KEY || '',
    paymentEndpoint: env.VITE_MERCADO_PAGO_PAYMENT_ENDPOINT || env.VITE_MERCADO_PAGO_CHECKOUT_ENDPOINT || '',
  },
  discord: {
    clientId: env.VITE_DISCORD_CLIENT_ID || '',
    redirectUrl: env.VITE_DISCORD_REDIRECT_URL || window.location.origin,
    webhookEndpoint: env.VITE_DISCORD_WEBHOOK_ENDPOINT || '',
  },
  email: {
    endpoint: env.VITE_EMAIL_ENDPOINT || '',
  },
};

export const integrations = {
  supabase: Boolean(appConfig.supabase.url && appConfig.supabase.anonKey),
  stripe: Boolean(appConfig.stripe.publicKey && appConfig.stripe.checkoutEndpoint),
  mercadoPago: Boolean(appConfig.mercadoPago.publicKey && appConfig.mercadoPago.paymentEndpoint),
  discordWebhook: Boolean(appConfig.discord.webhookEndpoint),
  email: Boolean(appConfig.email.endpoint),
};

export const isAnyPaymentConfigured = integrations.stripe || integrations.mercadoPago;
