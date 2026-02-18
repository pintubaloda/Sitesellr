import axios from "axios";
import { getStoredAccessToken, getStoredStoreId } from "./session";

const runtimeDefaultBase =
  typeof window !== "undefined"
    ? `${window.location.origin}/api`
    : "http://localhost:5000/api";

const baseURL = process.env.REACT_APP_API_BASE || runtimeDefaultBase;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Optional default store scoping via env
const defaultStoreId = process.env.REACT_APP_STORE_ID;
if (defaultStoreId) {
  api.defaults.headers.common["X-Store-Id"] = defaultStoreId;
} else {
  const savedStoreId = getStoredStoreId();
  if (savedStoreId) {
    api.defaults.headers.common["X-Store-Id"] = savedStoreId;
  }
}

const savedToken = getStoredAccessToken();
if (savedToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
}

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export default api;
