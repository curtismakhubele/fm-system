import { msalInstance, loginRequest, SP_CONFIG } from "./msalConfig";

const GRAPH = "https://graph.microsoft.com/v1.0";
const SMALL_LIMIT = 4 * 1024 * 1024; // Graph's simple-upload ceiling
const CHUNK_SIZE = 16 * 320 * 1024; // must be a multiple of 320 KiB

let siteIdCache = null;

async function getToken() {
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) throw new Error("Not signed in");
  try {
    const res = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
    return res.accessToken;
  } catch {
    const res = await msalInstance.acquireTokenPopup({ ...loginRequest, account });
    return res.accessToken;
  }
}

async function graph(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${GRAPH}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph ${res.status}: ${body}`);
  }
  return res.status === 204 ? null : res;
}

const encodePath = (p) => p.split("/").filter(Boolean).map(encodeURIComponent).join("/");

async function getSiteId() {
  if (siteIdCache) return siteIdCache;
  const res = await graph(`/sites/${SP_CONFIG.siteHostname}:${SP_CONFIG.sitePath}`);
  siteIdCache = (await res.json()).id;
  return siteIdCache;
}

const filePath = (name) => encodePath(`${SP_CONFIG.folder}/${name}`);

export async function listFiles() {
  const siteId = await getSiteId();
  try {
    const res = await graph(`/sites/${siteId}/drive/root:/${encodePath(SP_CONFIG.folder)}:/children?$orderby=name`);
    return (await res.json()).value.filter((i) => i.file);
  } catch (e) {
    if (String(e.message).includes("404")) return []; // folder not created yet
    throw e;
  }
}

export async function uploadFile(file, onProgress) {
  const siteId = await getSiteId();
  const base = `/sites/${siteId}/drive/root:/${filePath(file.name)}`;

  if (file.size <= SMALL_LIMIT) {
    const res = await graph(`${base}:/content`, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    onProgress?.(100);
    return res.json();
  }

  const sessionRes = await graph(`${base}:/createUploadSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "replace" } }),
  });
  const { uploadUrl } = await sessionRes.json();

  let start = 0;
  let result = null;
  while (start < file.size) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    // The upload URL is pre-authorized: do not send the Authorization header
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Range": `bytes ${start}-${end - 1}/${file.size}` },
      body: file.slice(start, end),
    });
    if (!res.ok && res.status !== 202) throw new Error(`Upload failed: ${res.status}`);
    if (res.status === 200 || res.status === 201) result = await res.json();
    start = end;
    onProgress?.(Math.round((start / file.size) * 100));
  }
  return result;
}

export async function getDownloadUrl(itemId) {
  const siteId = await getSiteId();
  const res = await graph(`/sites/${siteId}/drive/items/${itemId}`);
  return (await res.json())["@microsoft.graph.downloadUrl"];
}

export async function deleteFile(itemId) {
  const siteId = await getSiteId();
  await graph(`/sites/${siteId}/drive/items/${itemId}`, { method: "DELETE" });
}

// Save/load app data as JSON files (settings, records, etc.)
export async function saveJson(name, data) {
  const siteId = await getSiteId();
  await graph(`/sites/${siteId}/drive/root:/${filePath(name)}:/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function loadJson(name) {
  const siteId = await getSiteId();
  try {
    const meta = await graph(`/sites/${siteId}/drive/root:/${filePath(name)}`);
    const url = (await meta.json())["@microsoft.graph.downloadUrl"];
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    if (String(e.message).includes("404")) return null;
    throw e;
  }
}
