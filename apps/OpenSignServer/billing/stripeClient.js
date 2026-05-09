import Stripe from 'stripe';

let stripeClient;

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export function getMonthlyPriceId() {
  if (!process.env.STRIPE_PRICE_MONTHLY) {
    throw new Error('STRIPE_PRICE_MONTHLY is not configured.');
  }
  return process.env.STRIPE_PRICE_MONTHLY;
}

export function getMonthlyESignLimit() {
  return Number.parseInt(process.env.LEXYSIGN_MONTHLY_ESIGN_LIMIT || '1000', 10);
}

export function subscriptionIsActive(status) {
  return ['active', 'trialing'].includes(status);
}
