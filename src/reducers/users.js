import { usersStore } from '../stores/initStores';

export default function userTabs(state = usersStore, action) {
    if (action.type === 'SET_USER_DATA') { 
      return action.payload;
    }     
    else if (action.type === 'CLEAR_USER_DATA') {
      return state = usersStore;
    }
    return state;
  }