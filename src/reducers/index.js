import { combineReducers } from 'redux'
import auth from './auth';
import settings from './settings';
import users from './users';
import router from './router';

const rootReducer = combineReducers({
  router,
  auth,  
  settings,
  users
})
export default rootReducer
