const SESSION_KEY = "jumpseat-crm-admin-stub-session";

export function isAdminStubEnabled() {
  return import.meta.env.DEV;
}

export function isAdminStubSession() {
  if (!isAdminStubEnabled()) return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function startAdminStubSession() {
  if (!isAdminStubEnabled()) return;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearAdminStubSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

