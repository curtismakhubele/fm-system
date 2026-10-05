// cloud.js — sign in with a Microsoft work/school account and store app data + files in SharePoint.
// Install:  npm install @azure/msal-browser @azure/msal-react
import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";

// ---- 1. Fill these in (see setup steps) ----
const CLIENT_ID = "YOUR_APP_CLIENT_ID";                 // Entra app registration > Application (client) ID
const SITE_HOST = "yourcompany.sharepoint.com";          // your SharePoint host name
const SITE_PATH = "/sites/YourSite";                     // the SharePoint site that will hold the data
const APP_FOLDER = "MyApp";                              // folder created in the site's Documents library
// "organizations" = any work/school account. Use your tenant ID instead to restrict to your org only.
const AUTHORITY = "https://login.microsoftonline.com/organizations";

const SCOPES = ["User.Read", "Sites.ReadWrite.All"];

export const msalInstance = new PublicClientApplication({
  auth: { clientId: CLIENT_ID, authority: AUTHORITY, redirectUri: window.location.origin },
  cache: { cacheLocation: "localStorage" },
});

// ---- Sign in / out ----
export async function signIn() {
  const result = await msalInstance.loginPopup({ scopes: SCOPES });
  msalInstance.setActiveAccount(result.account);
  return result.account;
}

export function signOut() {
  return msalInstance.logoutPopup();
}

async function getToken() {
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) throw new Error("Not signed in");
  try {
    return (await msalInstance.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      return (await msalInstance.acquireTokenPopup({ scopes: SCOPES, account })).accessToken;
    }
    throw e;
  }
}

// ---- Microsoft Graph helper ----
async function graph(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
  if (!res.ok) {
    const err = new Error(`Graph request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res;
}

let siteId;
async function getSiteId() {
  if (!siteId) siteId = (await (await graph(`/sites/${SITE_HOST}:${SITE_PATH}`)).json()).id;
  return siteId;
}

const enc = (name) => encodeURIComponent(name);

// ---- App data (saved as JSON files in SharePoint) ----
export async function saveData(name, data) {
  const id = await getSiteId();
  await graph(`/sites/${id}/drive/root:/${APP_FOLDER}/data/${enc(name)}.json:/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Returns null if nothing has been saved yet.
export async function loadData(name) {
  const id = await getSiteId();
  try {
    const res = await graph(`/sites/${id}/drive/root:/${APP_FOLDER}/data/${enc(name)}.json:/content`);
    return await res.json();
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

// ---- File hosting in SharePoint ----
// Simple upload works up to 250 MB. Larger files need a Graph upload session.
export async function uploadFile(file) {
  const id = await getSiteId();
  const res = await graph(`/sites/${id}/drive/root:/${APP_FOLDER}/Files/${enc(file.name)}:/content`, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  return res.json(); // includes id, name, size, webUrl
}

export async function listFiles() {
  const id = await getSiteId();
  try {
    const res = await graph(`/sites/${id}/drive/root:/${APP_FOLDER}/Files:/children`);
    return (await res.json()).value; // each: id, name, size, webUrl
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

// Creates a link that anyone in your organization can open.
export async function shareFile(itemId) {
  const id = await getSiteId();
  const res = await graph(`/sites/${id}/drive/items/${itemId}/createLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "view", scope: "organization" }),
  });
  return (await res.json()).link.webUrl;
}

export async function deleteFile(itemId) {
  const id = await getSiteId();
  await graph(`/sites/${id}/drive/items/${itemId}`, { method: "DELETE" });
}
