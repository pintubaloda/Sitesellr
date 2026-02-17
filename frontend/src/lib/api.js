import axios from "axios";

const baseURL = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Optional default store scoping via env
const defaultStoreId = process.env.REACT_APP_STORE_ID;
if (defaultStoreId) {
  api.defaults.headers.common["X-Store-Id"] = defaultStoreId;
}

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export default api;
