import { settingsStore } from '../stores/initStores';

export default function settings(state = settingsStore, action) {
    if (action.type === 'GET_SETTINGS') {       
      return action.payload;
    } 
    else if (action.type === 'SET_SETTINGS') { 
      return action.payload;
    }
    else if(action.type === 'LOADING_SHOW') {            
      return {...state, isLoadingShow : action.payload};
    }
    return state;
  }
