import { authStore } from '../stores/initStores';

export default function auth(state = authStore, action) {
    if (action.type === 'CHECK_AUTH_START') { 
      return action.payload;
    } 
    else if (action.type === 'LOGIN')  {            
      return action.payload;
    }
    else if (action.type === 'LOGOUT')  {      
      return action.payload;
    }
    else if (action.type === 'IS_NEED_AUTH')  {      
      return action.payload;
    }
    else if (action.type === 'REFRESH_TOKEN_LOGIN')  {      
      return action.payload;
    }
    else if (action.type === 'CHECK_TOKEN_EXPR')  {      
      return action.payload;
    }
    return state;
  }