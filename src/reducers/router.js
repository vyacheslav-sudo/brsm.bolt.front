const initialState = {
  location: {
    pathname: window.location.pathname
  }
};

export default function router(state = initialState, action) {
  if (action.type === 'ROUTE_CHANGED') {
    return {
      ...state,
      location: {
        ...state.location,
        ...action.payload
      }
    };
  }

  return state;
}
