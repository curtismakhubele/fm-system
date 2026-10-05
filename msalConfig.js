import { PublicClientApplication } from "@azure/msal-browser";

// Fill these in (see README.md for where to find each value)
export const SP_CONFIG = {
  clientId: "YOUR_APP_CLIENT_ID",
  // Your tenant ID for one organization, or "organizations" to allow any work/school account
  tenantId: "YOUR_TENANT_ID",
  siteHostname: "yourcompany.sharepoint.com",
  sitePath: "/sites/YourSite",
  // Folder inside the site's default document library where app files go
  folder: "AppData",
};

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: SP_CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${SP_CONFIG.tenantId}`,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: "sessionStorage" },
});

export const loginRequest = {
  scopes: ["User.Read", "Sites.ReadWrite.All"],
};
