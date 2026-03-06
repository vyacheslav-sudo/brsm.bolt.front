import { configApp } from '../config';
import { settingsStore } from '../stores/initStores';

export const getSettings = () => (dispatch, getState) => {
    let _settings = localStorage.getItem(configApp.LOCAL_STORE_SETTINGS);    
    if(_settings) {
        let params = JSON.parse(_settings);
        return dispatch({type: 'GET_SETTINGS', payload : {...getState().settings, params } });
    }       
    return dispatch({type: 'GET_SETTINGS', settingsStore});
};  

export const setSettings = (params) => (dispatch, getState) => {    
      if(getState().settings.params) {
          //dispatch({type: 'SET_SETTINGS', payload: {...getState().settings, item}});        
          dispatch({type: 'SET_SETTINGS', payload: {...getState().settings, params}});
      }
      return localStorage.setItem(configApp.LOCAL_STORE_SETTINGS, JSON.stringify(getState().settings.params));
};