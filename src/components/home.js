import React, { Component } from 'react';
import { connect } from 'react-redux';
import { checkAccessRoute } from '../actions/auth';

class Home extends Component {
  static displayName = Home.name;

  componentDidMount() {
    checkAccessRoute(this.props);
  }

  render () {
    return (
      <>                 
        {/* <Users  /> */}
      </>
    );
  }
}

export default connect(
  state => ({
    auth: state.auth,
    router: state.router
  }),
  dispatch => ({
  })
)(Home);
