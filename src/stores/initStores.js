export const authStore = {
  isAuth: false,
  isLoginShow: false,
  AccessToken: null,
  UserType: 0,
  RefreshToken: null,
  UserInn: null,
  Issued: null,
  Expires: null
};

export const usersStore = {
  userTypes: []
};

export const userTypeStore = [
  {
    id: 1,
    name: 'WebAdmin',
    type: 'web'
  },
  {
    id: 2,
    name: 'WebManager',
    type: 'web'
  },
  {
    id: 3,
    name: 'GlobalApiClient',
    type: 'api'
  }
];

export const settingsStore = {
  titleMain: 'BRSM Bolt',
  isLoadingShow: false
};

export const routesStore = [
  {
    id: 1,
    path: '/',
    title: '\u0413\u043e\u043b\u043e\u0432\u043d\u0430',
    nav: [0]
  },
  {
    id: 2,
    path: '/users',
    title: '\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456',
    nav: [1],
    access: {
      allow: [1]
    }
  },
  {
    id: 3,
    path: '/references',
    title: '\u0414\u043e\u0432\u0456\u0434\u043d\u0438\u043a\u0438',
    nav: [1],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 8,
    path: '/products',
    title: '\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438',
    nav: [1, 3],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 15,
    path: '/product-prices',
    title: '\u0426\u0456\u043d\u0438 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0456\u0432',
    nav: [1, 3],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 20,
    path: '/categories',
    title: '\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457',
    nav: [1, 3],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 21,
    path: '/sections',
    title: '\u0421\u0435\u043a\u0446\u0456\u0457',
    nav: [1, 3],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 19,
    path: '/subcategories',
    title: '\u041f\u0456\u0434\u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457',
    nav: [1, 3],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 12,
    path: '/terminals',
    title: '\u0422\u0435\u0440\u043c\u0456\u043d\u0430\u043b\u0438 \u0410\u0417\u041a',
    nav: [1, 3],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 13,
    path: '/regions',
    title: '\u0420\u0435\u0433\u0456\u043e\u043d\u0438',
    nav: [1, 3],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 14,
    path: '/bolt-orders',
    title: '\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f',
    nav: [1],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 16,
    path: '/images',
    title: '\u0417\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f',
    nav: [1, 3],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 17,
    path: '/timetables',
    title: '\u0420\u043e\u0437\u043a\u043b\u0430\u0434',
    nav: [1, 3],
    access: {
      allow: [1, 2]
    }
  },
  {
    id: 18,
    path: '/migration-sessions',
    title: '\u041c\u0456\u0433\u0440\u0430\u0446\u0456\u044f \u0434\u0430\u043d\u0438\u0445',
    nav: [1],
    access: {
      allow: [1, 2]
    }
  }
];

export const routePaths = {
  home: '/',
  users: '/users',
  references: '/references',
  products: '/products',
  productPrices: '/product-prices',
  sections: '/sections',
  categories: '/categories',
  subcategories: '/subcategories',
  regions: '/regions',
  terminals: '/terminals',
  boltOrders: '/bolt-orders',
  images: '/images',
  timetables: '/timetables',
  migrationSessions: '/migration-sessions'
};

export const routeByPath = routesStore.reduce((acc, route) => {
  acc[route.path] = route;
  return acc;
}, {});

export const routeById = routesStore.reduce((acc, route) => {
  acc[route.id] = route;
  return acc;
}, {});

export const getRouteByPath = (path) => routeByPath[path] || null;
