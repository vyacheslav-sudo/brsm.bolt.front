import axios from 'axios';
import { configApp } from '../config';

export const authApi = axios.create({
  baseURL: configApp.API_AUTH
});

export const coreApi = axios.create({
  baseURL: configApp.API_CORE
});

function getStoredAccessToken() {
  const rawUser = localStorage.getItem(configApp.LOCAL_STORE_CURR_USER);
  if (!rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser);
    return user && user.AccessToken ? user.AccessToken : null;
  } catch (e) {
    return null;
  }
}

function attachAuthToken(config) {
  if (!config.headers || !config.headers.Authorization) {
    const token = getStoredAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = 'Bearer ' + token;
    }
  }

  return config;
}

authApi.interceptors.request.use(attachAuthToken);
coreApi.interceptors.request.use(attachAuthToken);
