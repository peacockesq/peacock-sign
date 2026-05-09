import express from 'express';
import { getBillingStatus, getTenantForSession } from '../../billing/entitlements.js';
import { getMonthlyESignLimit, getMonthlyPriceId, getStripeClient } from '../../billing/stripeClient.js';

export const billingRouter = express.Router();

function getSessionToken(req) {
  return req.headers['x-parse-session-token'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
}

function publicUrl() {
  return (process.env.PUBLIC_URL || process.env.HOST_URL || 'https://sign.lexyalgo.com').replace(/\/$/, '');
}

billingRouter.get('/status', async (req, res) => {
  try {
    const { tenant } = await getTenantForSession(getSessionToken(req));
    res.json(await getBillingStatus(tenant));
  } catch (err) {
    res.status(err.code === Parse.Error.SESSION_MISSING ? 401 : 400).json({ message: err.message });
  }
});

billingRouter.post('/create-checkout-session', async (req, res) => {
  try {
    const { tenant, extUser } = await getTenantForSession(getSessionToken(req));
    const stripe = getStripeClient();
    let customerId = tenant.get('StripeCustomerId');
    const email = extUser.get('Email') || tenant.get('EmailAddress');
    const name = extUser.get('Name') || tenant.get('TenantName') || email;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { lexysignTenantId: tenant.id },
      });
      customerId = customer.id;
      tenant.set('StripeCustomerId', customerId);
      await tenant.save(null, { useMasterKey: true });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: getMonthlyPriceId(), quantity: 1 }],
      allow_promotion_codes: true,
      payment_method_collection: 'always',
      success_url:
        process.env.STRIPE_SUCCESS_URL || `${publicUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: process.env.STRIPE_CANCEL_URL || `${publicUrl()}/billing/cancel`,
      client_reference_id: tenant.id,
      metadata: { lexysignTenantId: tenant.id },
      subscription_data: {
        metadata: { lexysignTenantId: tenant.id },
      },
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.log('create checkout failed', err.message);
    res.status(400).json({ message: err.message });
  }
});

billingRouter.post('/create-portal-session', async (req, res) => {
  try {
    const { tenant } = await getTenantForSession(getSessionToken(req));
    const customerId = tenant.get('StripeCustomerId');
    if (!customerId) {
      return res.status(400).json({ message: 'No Stripe customer exists for this tenant.' });
    }
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${publicUrl()}/dashboard/35KBoSgoAK`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

async function findTenantById(tenantId) {
  const query = new Parse.Query('partners_Tenant');
  return query.get(tenantId, { useMasterKey: true });
}

async function findTenantByCustomer(customerId) {
  const query = new Parse.Query('partners_Tenant');
  query.equalTo('StripeCustomerId', customerId);
  return query.first({ useMasterKey: true });
}

async function updateTenantFromSubscription(subscription) {
  const tenantId = subscription.metadata?.lexysignTenantId;
  const tenant = tenantId
    ? await findTenantById(tenantId).catch(() => null)
    : await findTenantByCustomer(subscription.customer);
  if (!tenant) return;

  tenant.set('StripeCustomerId', subscription.customer);
  tenant.set('StripeSubscriptionId', subscription.id);
  tenant.set('SubscriptionStatus', subscription.status);
  tenant.set('MonthlyESignLimit', getMonthlyESignLimit());
  if (subscription.current_period_start) {
    tenant.set('CurrentPeriodStart', new Date(subscription.current_period_start * 1000));
  }
  if (subscription.current_period_end) {
    tenant.set('CurrentPeriodEnd', new Date(subscription.current_period_end * 1000));
  }
  await tenant.save(null, { useMasterKey: true });
}

export async function stripeWebhook(req, res) {
  try {
    const stripe = getStripeClient();
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).send('Stripe webhook secret is not configured.');

    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await updateTenantFromSubscription(subscription);
      }
    }
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await updateTenantFromSubscription(event.data.object);
    }
    res.json({ received: true });
  } catch (err) {
    console.log('stripe webhook failed', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
