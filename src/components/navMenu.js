import React, { Component } from 'react';
import { Collapse, Container, Navbar, NavbarBrand, NavbarToggler,
  UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, NavItem, NavLink } from 'reactstrap';
import { connect } from 'react-redux';
import { logOut } from '../actions/auth';
import { settingsStore, routePaths, routeByPath } from '../stores/initStores';
import './navMenu.css';
import withNavigation from '../routing/withNavigation';

class NavMenu extends Component {
  static displayName = NavMenu.name;

  constructor(props) {
    super(props);

    this.toggleNavbar = this.toggleNavbar.bind(this);
    this.state = {
      collapsed: true
    };
  }

  toggleNavbar() {
    this.setState({
      collapsed: !this.state.collapsed
    });
  }

  onRoute(item) {
    this.props.navigate(item);
  }

  render() {
    const homeRoute = routeByPath[routePaths.home];
    const usersRoute = routeByPath[routePaths.users];
    const referencesRoute = routeByPath[routePaths.references];
    const productsRoute = routeByPath[routePaths.products];
    const productPricesRoute = routeByPath[routePaths.productPrices];
    const sectionsRoute = routeByPath[routePaths.sections];
    const categoriesRoute = routeByPath[routePaths.categories];
    const subcategoriesRoute = routeByPath[routePaths.subcategories];
    const timetablesRoute = routeByPath[routePaths.timetables];
    const regionsRoute = routeByPath[routePaths.regions];
    const terminalsRoute = routeByPath[routePaths.terminals];
    const boltOrdersRoute = routeByPath[routePaths.boltOrders];
    const migrationSessionsRoute = routeByPath[routePaths.migrationSessions];
    const imagesRoute = routeByPath[routePaths.images];

    return (
      <header>
          <Navbar className="navbar-expand-sm navbar-toggleable-sm ng-white border-bottom box-shadow mb-3" light container={false}>
          <Container>
            <NavbarToggler onClick={this.toggleNavbar} className='navbar-toggler' />
            <NavbarBrand className='nav-link-custom' onClick={this.onRoute.bind(this, homeRoute.path)}>{settingsStore.titleMain}</NavbarBrand>
            <Collapse className="d-sm-inline-flex" isOpen={!this.state.collapsed} navbar>
              <ul className="navbar-nav flex-grow-1">
              {this.props.auth.isAuth ?
              <>
              <UncontrolledDropdown nav inNavbar active>
                  <DropdownToggle nav caret>{referencesRoute.title}</DropdownToggle>
                  <DropdownMenu>
                      <DropdownItem onClick={this.onRoute.bind(this, productsRoute.path)}>{productsRoute.title}</DropdownItem>
                      <DropdownItem onClick={this.onRoute.bind(this, imagesRoute.path)}>{imagesRoute.title}</DropdownItem>
                      <DropdownItem onClick={this.onRoute.bind(this, timetablesRoute.path)}>{timetablesRoute.title}</DropdownItem>
                      <DropdownItem onClick={this.onRoute.bind(this, productPricesRoute.path)}>{productPricesRoute.title}</DropdownItem>
                      <DropdownItem divider={true} />                      
                      <DropdownItem onClick={this.onRoute.bind(this, sectionsRoute.path)}>{sectionsRoute.title}</DropdownItem>
                      <DropdownItem onClick={this.onRoute.bind(this, categoriesRoute.path)}>{categoriesRoute.title}</DropdownItem>
                      <DropdownItem onClick={this.onRoute.bind(this, subcategoriesRoute.path)}>{subcategoriesRoute.title}</DropdownItem>
                      <DropdownItem divider={true} />
                      <DropdownItem onClick={this.onRoute.bind(this, regionsRoute.path)}>{regionsRoute.title}</DropdownItem>
                      <DropdownItem onClick={this.onRoute.bind(this, terminalsRoute.path)}>{terminalsRoute.title}</DropdownItem>
                  </DropdownMenu>
              </UncontrolledDropdown>
              {[1, 2].includes(this.props.auth.UserType) ? <NavItem><NavLink onClick={this.onRoute.bind(this, boltOrdersRoute.path)} className="text-dark nav-link-custom">{boltOrdersRoute.title}</NavLink></NavItem> : <></>}
              {[1, 2].includes(this.props.auth.UserType) ?
                <UncontrolledDropdown nav inNavbar active>
                  <DropdownToggle nav caret>Сервіс</DropdownToggle>
                  <DropdownMenu>
                    <DropdownItem onClick={this.onRoute.bind(this, migrationSessionsRoute.path)}>{migrationSessionsRoute.title}</DropdownItem>
                  </DropdownMenu>
                </UncontrolledDropdown> : <></>}
              {[1].includes(this.props.auth.UserType) ? <NavItem><NavLink onClick={this.onRoute.bind(this, usersRoute.path)} className="text-dark nav-link-custom">{usersRoute.title}</NavLink></NavItem> : <></>}
              </> : <></> }
              </ul>

              <ul className="navbar-nav" hidden={!this.props.auth.isAuth}>
                <UncontrolledDropdown nav inNavbar active>
                  <DropdownToggle nav style={{paddingRight: '0px'}}>{this.props.auth.UserName }</DropdownToggle>
                  <DropdownMenu end>
                    <DropdownItem onClick={this.props.onLogOut}><i className="dx-icon-export nav-icon"></i> <span>Вийти</span></DropdownItem>
                  </DropdownMenu>
                </UncontrolledDropdown>
              </ul>
            </Collapse>
          </Container>
        </Navbar>
      </header>
    );
  }
}

const ConnectedNavMenu = connect(
  state => ({
    auth: state.auth
  }),
  dispatch => ({
    onLogOut: () => {
      dispatch(logOut());
    }
  })
)(NavMenu);

export default withNavigation(ConnectedNavMenu);
