import React, { Component } from 'react';
import { Container } from 'reactstrap';
import Login from './auth/login';
import NavMenu from './navMenu';
import Navs from './navs';
import LoadingFullScreen from '../components/loading-fullscreen';
import { connect } from 'react-redux';
import { checkAuthStart, checkTokenExpr, checkIsNeedAuth } from '../actions/auth';
import { settingsStore } from '../stores/initStores';

class Layout extends Component {
  static displayName = Layout.name;

  constructor(props) {
    super(props);
    this.props.onCheckAuthStart();
    this.state = {
      isNeedAuth : true
    };   
  }

  refreshToken() {
    this.props.onCheckTokenExpr();
  }

  componentDidMount() {        
    document.title = settingsStore.titleMain;
    this.interval = setInterval(() => 
    this.refreshToken(), 1 * 60 * 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  componentDidUpdate() {    
    let _isNeedAuth = checkIsNeedAuth(this.props); 

    if(this.state.isNeedAuth !== _isNeedAuth) {
      this.setState({
        isNeedAuth : _isNeedAuth
      });
    }

  }

  render () {    
    return (
      <>            
      <LoadingFullScreen visible={this.props.settings.isLoadingShow} />    
      <div className="content">      
        <NavMenu />          
          <Container>
            <div className="dx-viewport">      
            <div className="top-row">
              <Navs />
            </div>
            {!this.state.isNeedAuth ? this.props.children : this.props.auth.isAuth ? this.props.children : this.props.auth.isLoginShow ? <Login /> : <></>}
            </div>
          </Container>                   
      </div>
      <div className="footer">
      <Container>
        &copy; {(new Date().getFullYear())} - {settingsStore.titleMain}
      </Container>                  
      </div>
      </>
    );
  }
}

export default connect(
  state => ({
    auth: state.auth,
    settings : state.settings,
    router : state.router
  }),
  dispatch => ({
    onCheckAuthStart: () => {
        dispatch(checkAuthStart());
    },
    onCheckTokenExpr: () => {
      dispatch(checkTokenExpr());
    }
  })
)(Layout);