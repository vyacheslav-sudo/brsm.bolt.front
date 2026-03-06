const prod = {
    API_AUTH: 'https://bolt1.brsm-nafta.com/api/v1',
    API_CORE: 'https://bolt1.brsm-nafta.com/api/v1',
    LOCAL_STORE_CURR_USER : 'currentUser',
    LOCAL_STORE_SETTINGS : 'userSettings'
};

const dev = {
    API_AUTH: 'https://bolt1-dev.brsm-nafta.com/api/v1',
    API_CORE: 'https://bolt1-dev.brsm-nafta.com/api/v1',
    //API_AUTH: 'https://bolt1.brsm-nafta.com/api/v1',
    //API_CORE: 'https://bolt1.brsm-nafta.com/api/v1',
    LOCAL_STORE_CURR_USER : 'currentUser',
    LOCAL_STORE_SETTINGS : 'userSettings'
  };

function isDev() {
  const explicitMode = import.meta.env.VITE_APP_MODE;
  if (explicitMode) {
    return explicitMode === 'development';
  }

  return import.meta.env.MODE === 'development';
}

export const configApp = isDev() ? dev : prod;
