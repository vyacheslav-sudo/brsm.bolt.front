import React, { Component } from 'react';
import { connect } from 'react-redux';
import { settingsStore, getRouteByPath, routeById } from '../stores/initStores';
import withNavigation from '../routing/withNavigation';
import './navMenu.css';

function NavRow(props) {

    if(props.hidden) {
        return (<></>);
    }

    // ищем путь в сторс
    let currPage = getRouteByPath(props.path);

    if(!currPage) { // если путь не найден ничего не возращаем
        return (<></>)
    }

    document.title = settingsStore.titleMain + ' | ' + currPage.title;

    let navs = [];

    if(currPage.nav[0] === 0) {
        navs.push(<span key={currPage.id}></span>);
    }
    else {
        currPage.nav.forEach((item) => {
            let _nav = routeById[item];
            if(_nav) {
               navs.push(<div className="navsRowItem" key={_nav.path}><span onClick={props.changeRoute.bind(this, _nav.path)} className="navs-link-custom">{_nav.title}</span> <span className="grey">\</span> </div>);
            }
       });
   
       navs.push(<div className="navsRowItem curr" key={currPage.path}>{currPage.title}</div>);
    }

    return (
        <div className="navsRow">
            {navs}
        </div>
    );
}

class Navs extends Component {

     onRoute(item) {
         this.props.navigate(item);
     }

    render() {
        return (            
            <NavRow path={this.props.router.location.pathname} hidden={!this.props.auth.isAuth} changeRoute={(e) => {this.onRoute(e)}} />
        );
    }
}

const ConnectedNavs = connect(
    state => ({      
      auth : state.auth,  
      router : state.router
    })
  )(Navs);

export default withNavigation(ConnectedNavs);
