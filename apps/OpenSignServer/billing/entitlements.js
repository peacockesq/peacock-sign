import { getMonthlyESignLimit, subscriptionIsActive } from './stripeClient.js';

export function getPeriodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function getExtUserForUser(userId) {
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', { __type: 'Pointer', className: '_User', objectId: userId });
  return extQuery.first({ useMasterKey: true });
}

export async function getTenantForExtUser(extUser) {
  if (!extUser?.id) return null;
  let hydratedExtUser = extUser;
  if (!hydratedExtUser.get('TenantId')) {
    const extQuery = new Parse.Query('contracts_Users');
    hydratedExtUser = await extQuery.get(extUser.id, { useMasterKey: true });
  }
  const tenantPtr = hydratedExtUser?.get('TenantId');
  if (!tenantPtr?.id) return null;
  const tenantQuery = new Parse.Query('partners_Tenant');
  return tenantQuery.get(tenantPtr.id, { useMasterKey: true });
}

export async function getTenantForSession(sessionToken) {
  if (!sessionToken) {
    throw new Parse.Error(Parse.Error.SESSION_MISSING, 'Parse session token is required.');
  }
  const sessionQuery = new Parse.Query('_Session');
  sessionQuery.equalTo('sessionToken', sessionToken);
  const session = await sessionQuery.first({ useMasterKey: true });
  const user = session?.get('user');
  if (!user?.id) {
    throw new Parse.Error(Parse.Error.SESSION_MISSING, 'Invalid Parse session token.');
  }
  const extUser = await getExtUserForUser(user.id);
  if (!extUser) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'LexySign user profile not found.');
  }
  const tenant = await getTenantForExtUser(extUser);
  if (!tenant) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'LexySign tenant not found.');
  }
  return { tenant, extUser, user };
}

async function getOrCreateUsageLedger(tenant, periodKey = getPeriodKey()) {
  const tenantPtr = { __type: 'Pointer', className: 'partners_Tenant', objectId: tenant.id };
  const query = new Parse.Query('billing_UsageLedger');
  query.equalTo('TenantId', tenantPtr);
  query.equalTo('PeriodKey', periodKey);
  let ledger = await query.first({ useMasterKey: true });
  if (!ledger) {
    ledger = new Parse.Object('billing_UsageLedger');
    ledger.set('TenantId', tenantPtr);
    ledger.set('PeriodKey', periodKey);
    ledger.set('Used', 0);
    ledger.set('Limit', tenant.get('MonthlyESignLimit') || getMonthlyESignLimit());
    ledger = await ledger.save(null, { useMasterKey: true });
  }
  return ledger;
}

export async function getBillingStatus(tenant) {
  const ledger = await getOrCreateUsageLedger(tenant);
  const status = tenant.get('SubscriptionStatus') || 'none';
  const limit = tenant.get('MonthlyESignLimit') || ledger.get('Limit') || getMonthlyESignLimit();
  return {
    tenantId: tenant.id,
    subscriptionStatus: status,
    active: subscriptionIsActive(status),
    monthlyESignLimit: limit,
    periodKey: ledger.get('PeriodKey'),
    used: ledger.get('Used') || 0,
    remaining: Math.max(0, limit - (ledger.get('Used') || 0)),
  };
}

export async function assertCanUseESignUnits(tenant, units = 1) {
  const status = await getBillingStatus(tenant);
  if (!status.active) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      'An active LexySign subscription is required to send signature requests.'
    );
  }
  if (status.used + units > status.monthlyESignLimit) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      `Monthly LexySign e-sign limit reached (${status.used}/${status.monthlyESignLimit}).`
    );
  }
  return status;
}

export async function recordESignUsage(tenant, units = 1) {
  await assertCanUseESignUnits(tenant, units);
  const ledger = await getOrCreateUsageLedger(tenant);
  ledger.increment('Used', units);
  const saved = await ledger.save(null, { useMasterKey: true });
  return saved.get('Used');
}
