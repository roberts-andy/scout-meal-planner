import { Configuration, LogLevel } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || ''

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: 'https://login.microsoftonline.com/consumers',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Verbose,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        console.log(`[MSAL:${LogLevel[level]}]`, message)
      },
    },
  },
}

/** Scopes requested when acquiring tokens.
 *  With the /consumers endpoint, only standard OIDC scopes are supported.
 *  The id_token is used as the Bearer token for our API. */
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
}
