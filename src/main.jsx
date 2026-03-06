import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useDispatch } from 'react-redux';
import App from './app.jsx';
import configureStore from './stores/configureStore';

const store = configureStore();

const RouterStateSync = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  React.useEffect(() => {
    dispatch({ type: 'ROUTE_CHANGED', payload: { pathname: location.pathname } });
  }, [dispatch, location.pathname]);

  return null;
};

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RouterStateSync />
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

