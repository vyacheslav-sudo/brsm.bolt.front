import { userTypeStore } from '../stores/initStores';

export const getData = () => (dispatch, getState) => {

    //показываем тип пользователей только нижнего уровня
    let userTypes = userTypeStore.filter(item => item.id > getState().auth.UserType);
    //let userTypes = userTypeStore;
    dispatch({type: 'SET_USER_DATA', payload : {...getState().users, userTypes }});
};

export const clearData = () => (dispatch) => {
    return dispatch({type: 'CLEAR_USER_DATA', payload : null});
};
