import { Configuration, LogLevel } from '@azure/msal-browser'

const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID || ''
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || ''

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://${tenantId}.ciamlogin.com/`,
    knownAuthorities: [`${tenantId}.ciamlogin.com`],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
    },
  },
}

/** Scopes requested when acquiring tokens */
export const loginRequest = {
  scopes: [`api://${clientId}/access_as_user`],
}
