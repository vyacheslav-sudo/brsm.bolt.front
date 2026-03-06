
import notify from 'devextreme/ui/notify';
import { configApp } from '../config';
import { authApi } from '../api/clientApi';
import { authStore, getRouteByPath } from '../stores/initStores';

function redirectTo(props, path) {
    if (props.navigate) {
        props.navigate(path);
        return;
    }

    if (props.history && props.history.push) {
        props.history.push(path);
        return;
    }

    window.location.assign(path);
}

export function checkIsNeedAuth(props) { 
    let _isNeedAuth = true;
    let routeData = getRouteByPath(props.router.location.pathname);    
    if(!routeData) {
      return false;
    }

    if(routeData.notAuth) {
      _isNeedAuth = false;
    }

    return _isNeedAuth;
}

export function checkAccessRoute(props) {

    let userType = props.auth.UserType;
    let routeData = getRouteByPath(props.router.location.pathname);

    if(!routeData) { return true; }
    if(routeData.notAuth) { return true; }
    if(!userType) { redirectTo(props, '/403'); return false; }
    if(!routeData.access) { return true; }

    let userTypeAllow = routeData.access.allow;
    let userTypeDisAllow = routeData.access.disallow;

    if(userTypeAllow) {
        if(userTypeAllow.includes(userType)) {
            return true;
        }
        else {
            redirectTo(props, '/403'); return false;
        }
    } 

    if(userTypeDisAllow) {
        if(userTypeDisAllow.includes(userType)) {
            redirectTo(props, '/403'); return false;
        }
        else {
            return true;
        }
    } 

    return true;
}

export const logIn = (loginData) => dispatch => {

    dispatch({type: 'LOADING_SHOW', payload : true});
    authApi.post('/token/PasswordLogin', {
        UserName: loginData.login,
        Password: loginData.password
    })
    .then(function(response) {

        // возвращается статус 200 с телом еррор и 401
        if(response.data.error) {
            notify(response.data.error, 'error', 1000);
            dispatch({type: 'LOADING_SHOW', payload : false});
            return;
        }

        localStorage.setItem(configApp.LOCAL_STORE_CURR_USER, JSON.stringify(response.data));        
        let payload = response.data;
        payload.isAuth = true;
        payload.isLoginShow = false;                
        dispatch({type: 'LOADING_SHOW', payload : false});
        return dispatch({ type: 'LOGIN', payload });
    })
    .catch(function (error) {
        if (error.response && error.response.data) {            
            notify(error.response.data.err_descr, 'error', 1000);
          }
        else {
            notify('Не вдалося виконати авторизацію', 'error', 1000);            
        }
        dispatch({type: 'LOADING_SHOW', payload : false});
        //console.log(error);
        //  console.log(error.response.data);
        //   console.log(error.response.status);
        //   console.log(error.response.headers);        
      });    
  };  

  export const checkTokenExpr = () => (dispatch, getState) => {    
    if(getState().auth.Expires && getState().auth.Expires != null) {
        let _dateExpr = getState().auth.Expires;   
        if((Math.floor(new Date(_dateExpr) - new Date()) / 1000) < 60) {        
           dispatch(refreshTokenLogin());
        }
    }
  };

  export const refreshTokenLogin = (token) => (dispatch, getState) => {
    
    let _refreshToken = token ? token : getState().auth.RefreshToken ? getState().auth.RefreshToken : '';

    authApi.post('/token/RefreshTokenLogin', {
        refreshToken: _refreshToken
    })
    .then(function(response) {    
        localStorage.setItem(configApp.LOCAL_STORE_CURR_USER, JSON.stringify(response.data));    
        let payload = response.data;
        payload.isAuth = true;
        payload.isLoginShow = false;      
        return dispatch({ type: 'REFRESH_TOKEN_LOGIN', payload });
    })
    .catch(function (error) {        
        return dispatch(logOut());
      });    
 };  

export const checkAuthStart = () => dispatch => {
    let _currUser = localStorage.getItem(configApp.LOCAL_STORE_CURR_USER);    

    if(_currUser) { 
        let payload = JSON.parse(_currUser);
        dispatch({type: 'LOADING_SHOW', payload : true});
        authApi.get('/ping/auth-ping')        
        .then(function(response) {
            if(response.status === 200) {
                payload.isAuth = true;
                payload.isLoginShow = false;            
                dispatch({type: 'LOADING_SHOW', payload : false})
                return dispatch({ type: 'CHECK_AUTH_START', payload });
            }            
        })
        .catch(function(error) {
            dispatch(refreshTokenLogin(payload.RefreshToken));
            dispatch({type: 'LOADING_SHOW', payload : false})
            return dispatch({ type: 'CHECK_AUTH_START', payload: authStore });
        })
     }    
     else {
        dispatch({type: 'LOADING_SHOW', payload : false});
        return dispatch({ type: 'CHECK_AUTH_START', payload: {...authStore, isLoginShow : true}});
     }
  };

export const logOut = () => dispatch => {
    localStorage.removeItem(configApp.LOCAL_STORE_CURR_USER);
    return dispatch({ type: 'LOGOUT', payload: {...authStore, isLoginShow : true}});   
  };  
