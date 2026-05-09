import axios from 'axios';
import crypto from 'node:crypto';
import { cloudServerUrl, serverAppId } from '../../Utils.js';

const serverUrl = cloudServerUrl;
const APPID = serverAppId;
const masterKEY = process.env.MASTER_KEY;

function normalizeEmail(email) {
  return email?.toLowerCase()?.replace(/\s/g, '') || '';
}

function randomPassword() {
  return crypto.randomBytes(36).toString('base64url');
}

function requireSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !apiKey) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      'LexySign shared Supabase auth is not configured.'
    );
  }

  return { url: url.replace(/\/$/, ''), apiKey };
}

async function fetchSupabaseUser(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Parse.Error(Parse.Error.SESSION_MISSING, 'Supabase access token is required.');
  }

  const { url, apiKey } = requireSupabaseConfig();
  try {
    const res = await axios.get(`${url}/auth/v1/user`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 10000,
    });
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    console.log('Supabase user validation failed', status || err?.message);
    throw new Parse.Error(Parse.Error.SESSION_MISSING, 'Invalid Supabase session.');
  }
}

async function loginAsParseUser(userId) {
  const axiosRes = await axios({
    method: 'POST',
    url: `${serverUrl}/loginAs`,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'X-Parse-Application-Id': APPID,
      'X-Parse-Master-Key': masterKEY,
    },
    params: { userId },
  });
  return axiosRes.data;
}

async function findParseUser({ supabaseUserId, email }) {
  const bySupabaseId = new Parse.Query(Parse.User);
  bySupabaseId.equalTo('supabaseUserId', supabaseUserId);
  const existingById = await bySupabaseId.first({ useMasterKey: true });
  if (existingById) return existingById;

  const byEmail = new Parse.Query(Parse.User);
  byEmail.equalTo('username', email);
  return byEmail.first({ useMasterKey: true });
}

async function saveParseUser({ supabaseUserId, email, name, phone }) {
  let user = await findParseUser({ supabaseUserId, email });
  if (!user) {
    user = new Parse.User();
    user.set('username', email);
    user.set('password', randomPassword());
    user.set('email', email);
  }

  user.set('supabaseUserId', supabaseUserId);
  user.set('authProvider', 'supabase');
  user.set('email', email);
  user.set('name', name || email);
  if (phone) user.set('phone', phone);

  return user.save(null, { useMasterKey: true });
}

async function ensureOrgAndTeam(extUser) {
  if (extUser.get('OrganizationId')) return;

  const orgCls = new Parse.Object('contracts_Organizations');
  orgCls.set('Name', extUser.get('Company') || 'LexySign Workspace');
  orgCls.set('IsActive', true);
  orgCls.set('ExtUserId', {
    __type: 'Pointer',
    className: 'contracts_Users',
    objectId: extUser.id,
  });
  orgCls.set('CreatedBy', extUser.get('UserId'));
  orgCls.set('TenantId', extUser.get('TenantId'));
  const orgRes = await orgCls.save(null, { useMasterKey: true });

  const teamCls = new Parse.Object('contracts_Teams');
  teamCls.set('Name', 'All Users');
  teamCls.set('OrganizationId', {
    __type: 'Pointer',
    className: 'contracts_Organizations',
    objectId: orgRes.id,
  });
  teamCls.set('IsActive', true);
  const teamRes = await teamCls.save(null, { useMasterKey: true });

  extUser.set('OrganizationId', {
    __type: 'Pointer',
    className: 'contracts_Organizations',
    objectId: orgRes.id,
  });
  extUser.set('TeamIds', [
    {
      __type: 'Pointer',
      className: 'contracts_Teams',
      objectId: teamRes.id,
    },
  ]);
  await extUser.save(null, { useMasterKey: true });
}

async function ensureTenantAndExtUser({ parseUser, email, name, company, role, phone, supabaseUserId }) {
  const userPtr = { __type: 'Pointer', className: '_User', objectId: parseUser.id };

  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', userPtr);
  let extUser = await extQuery.first({ useMasterKey: true });
  if (extUser) {
    extUser.set('SupabaseUserId', supabaseUserId);
    extUser.set('Email', email);
    extUser.set('Name', name || email);
    extUser.set('IsDisabled', false);
    await extUser.save(null, { useMasterKey: true });
    await ensureOrgAndTeam(extUser);
    return extUser;
  }

  const partnerQuery = new Parse.Query('partners_Tenant');
  partnerQuery.equalTo('UserId', userPtr);
  let tenant = await partnerQuery.first({ useMasterKey: true });
  if (!tenant) {
    tenant = new Parse.Object('partners_Tenant');
    tenant.set('UserId', userPtr);
    tenant.set('TenantName', company || `${name || email} Workspace`);
    tenant.set('EmailAddress', email);
    tenant.set('IsActive', true);
    tenant.set('CreatedBy', userPtr);
    if (phone) tenant.set('ContactNumber', phone);
    tenant = await tenant.save(null, { useMasterKey: true });
  }

  extUser = new Parse.Object('contracts_Users');
  extUser.set('UserId', userPtr);
  extUser.set('UserRole', role || 'contracts_Admin');
  extUser.set('Email', email);
  extUser.set('Name', name || email);
  extUser.set('Company', company || tenant.get('TenantName'));
  extUser.set('SupabaseUserId', supabaseUserId);
  extUser.set('IsDisabled', false);
  if (phone) extUser.set('Phone', phone);
  extUser.set('TenantId', {
    __type: 'Pointer',
    className: 'partners_Tenant',
    objectId: tenant.id,
  });
  extUser = await extUser.save(null, { useMasterKey: true });
  await ensureOrgAndTeam(extUser);
  return extUser;
}

export default async function loginWithSupabase(request) {
  const supabaseUser = await fetchSupabaseUser(request.params.accessToken);
  const email = normalizeEmail(supabaseUser.email);
  if (!email) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, 'Supabase user has no email.');
  }

  const metadata = supabaseUser.user_metadata || {};
  const appMetadata = supabaseUser.app_metadata || {};
  const name = metadata.full_name || metadata.name || email;
  const company =
    appMetadata.organization_name ||
    appMetadata.company ||
    metadata.organization_name ||
    metadata.company ||
    request.params.company ||
    'LexySign Workspace';
  const role = appMetadata.lexysign_role || metadata.lexysign_role || 'contracts_Admin';
  const phone = metadata.phone || supabaseUser.phone || '';

  const parseUser = await saveParseUser({
    supabaseUserId: supabaseUser.id,
    email,
    name,
    phone,
  });
  await ensureTenantAndExtUser({
    parseUser,
    email,
    name,
    company,
    role,
    phone,
    supabaseUserId: supabaseUser.id,
  });

  const login = await loginAsParseUser(parseUser.id);
  return {
    ...login,
    email,
    username: email,
    name,
    supabaseUserId: supabaseUser.id,
  };
}
