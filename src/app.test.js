import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import App from './app.jsx';
import configureStore from './stores/configureStore';

function waitFor(check, timeoutMs = 2000, intervalMs = 25) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    function tick() {
      if (check()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('Timed out while waiting for condition'));
        return;
      }

      setTimeout(tick, intervalMs);
    }

    tick();
  });
}

function renderAtPath(pathname) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);
  const store = configureStore();

  act(() => {
    root.render(
      <Provider store={store}>
        <MemoryRouter
          initialEntries={[pathname]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>
      </Provider>
    );
  });

  return {
    div,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      div.remove();
    }
  };
}

beforeEach(() => {
  localStorage.clear();
});

it('smoke: app renders shell', async () => {
  const view = renderAtPath('/');

  await waitFor(() => !!view.div.querySelector('.content'));
  expect(view.div.querySelector('.content')).not.toBeNull();

  view.unmount();
});

it('smoke: protected route shows login for unauthenticated user', async () => {
  const view = renderAtPath('/users');

  await waitFor(() => !!view.div.querySelector('#loginContainer'));
  expect(view.div.querySelector('#loginContainer')).not.toBeNull();

  view.unmount();
});

it('smoke: removed orders-update route does not render old screen', async () => {
  const view = renderAtPath('/orders-update');

  await waitFor(() => !!view.div.querySelector('.content'));
  expect(view.div.querySelector('#orderFindContainer')).toBeNull();

  view.unmount();
});

