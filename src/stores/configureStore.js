import { configureStore as createStore } from '@reduxjs/toolkit';
import rootReducer from '../reducers';

export default function configureStore(preloadedState) {
  return createStore({
    reducer: rootReducer,
    preloadedState
  });
}
