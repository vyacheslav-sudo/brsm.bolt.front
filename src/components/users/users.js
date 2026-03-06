import React, { Component } from 'react';
import { connect } from 'react-redux';
import UserList from './user-list';
import AddUser from './add-user';
import EditUser from './edit-user';
import { getData, clearData } from '../../actions/users';
import { checkAccessRoute } from '../../actions/auth';
import '../settings.css';

class Users extends Component {  

    constructor(props) {  
         super(props);         
         this.state = {
           mainGrid : true,
           addUser : false,
           editUser : false         
         }         
    }

    changeState(e) {
      this.setState(e);
    }

    componentDidMount() {      
      checkAccessRoute(this.props);
      this.props.onGetDataUsers();      
    }

    componentWillUnmount() {
      this.props.onClearUsersData();
    }

  render() {    
     return (             
          <div style={{marginTop: "15px"}}>
            {this.state.mainGrid ? <UserList parentState={this.state} childState={this.changeState.bind(this)} /> : <></>}
            {this.state.addUser ? <AddUser parentState={this.state} childState={this.changeState.bind(this)} /> : <></>}
            {this.state.editUser ? <EditUser parentState={this.state} childState={this.changeState.bind(this)} /> : <></>}                        
            
          </div>
     );
   }
}

export default connect(
    state => ({
      auth: state.auth,
      router : state.router,
      settings : state.settings
    }),
    dispatch => ({
        onGetDataUsers: () => {
          dispatch(getData());
        },
        onClearUsersData: () => {          
           dispatch(clearData());
        }
    })
  )(Users);