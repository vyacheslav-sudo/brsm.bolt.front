import 'bootstrap/dist/css/bootstrap.css';
import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { NotFound } from './components/notFound';
import { NotAccess } from './components/notAccess';
import { routePaths } from './stores/initStores';
import Layout from './components/layout';
import Home from './components/home';
import Users from './components/users/users';
import Regions from './components/references/regions/regions';
import Terminals from './components/references/terminals/terminals';
import Products from './components/references/products/products';
import ProductPrices from './components/references/products/product-prices';
import Sections from './components/references/sections/sections';
import Categories from './components/references/categories/categories';
import Subcategories from './components/references/subcategories/subcategories';
import Timetables from './components/references/timetables/timetables';
import BoltOrders from './components/orders/bolt-orders';
import Images from './components/references/images/images';
import MigrationSessions from './components/migration/migration-sessions';

import uaMessages from './other/dx.messages.uk.json';
import { locale, loadMessages } from 'devextreme/localization';
import './components/custom.css';
import './components/loading-fullscreen.css';
import 'devextreme/dist/css/dx.common.css';
import 'devextreme/dist/css/dx.softblue.compact.css';
import './components/dx.custom.css';

loadMessages(uaMessages);
locale('uk');

const App = () => (
  <Layout>
    <Routes>
      <Route path={routePaths.home} element={<Home />} />
      <Route path={routePaths.users} element={<Users />} />
      <Route path={routePaths.regions} element={<Regions />} />
      <Route path={routePaths.terminals} element={<Terminals />} />
      <Route path={routePaths.products} element={<Products />} />
      <Route path={routePaths.productPrices} element={<ProductPrices />} />
      <Route path={routePaths.sections} element={<Sections />} />
      <Route path={routePaths.categories} element={<Categories />} />
      <Route path={routePaths.subcategories} element={<Subcategories />} />
      <Route path={routePaths.timetables} element={<Timetables />} />
      <Route path={routePaths.boltOrders} element={<BoltOrders />} />
      <Route path={routePaths.migrationSessions} element={<MigrationSessions />} />
      <Route path={routePaths.images} element={<Images />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="/403" element={<NotAccess />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  </Layout>
);

export default App;
