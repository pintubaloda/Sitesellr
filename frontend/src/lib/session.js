const ACCESS_TOKEN_KEY = "sitesellr_access_token";
const REFRESH_TOKEN_KEY = "sitesellr_refresh_token";
const STORE_ID_KEY = "sitesellr_store_id";

export const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || "";
export const getStoredRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY) || "";
export const getStoredStoreId = () => localStorage.getItem(STORE_ID_KEY) || "";

export const setStoredTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearStoredTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const setStoredStoreId = (storeId) => {
  if (storeId) {
    localStorage.setItem(STORE_ID_KEY, storeId);
  }
};

export const clearStoredStoreId = () => {
  localStorage.removeItem(STORE_ID_KEY);
};
