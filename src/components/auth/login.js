import React, { Component } from "react";
import { Card, CardHeader, Form, FormGroup, Input, Label, FormFeedback } from 'reactstrap';
import { Button } from 'devextreme-react/button';
import { connect } from 'react-redux';
import { logIn } from '../../actions/auth';
import './login.css';
// import Loading from '../loading';

class Login extends Component {

    constructor (props) {
        super(props);

        this.state = {
          login: '',
          password: '',
          errors: {}
        };

        this.handleValidSubmit = this.handleValidSubmit.bind(this);
      }

    handleValidSubmit(e) {
      e.preventDefault();

      const errors = {};
      if (!this.state.login.trim()) {
        errors.login = "Вкажіть свій логін";
      }
      if (!this.state.password) {
        errors.password = "Вкажіть свій пароль";
      }

      this.setState({ errors });
      if (Object.keys(errors).length > 0) {
        return;
      }

      this.props.onLogin({
        login: this.state.login,
        password: this.state.password
      });
   }

    render () {
        return (
            <div className="col-12" id="loginContainer">
                <div className="col-sm-9 col-md-7 mx-auto p-0 pb-3" style={{maxWidth: "350px", marginTop: "50px"}}>
                <Card className="card-login">
                    <CardHeader tag="h4">Авторизація</CardHeader>
                    <Form onSubmit={this.handleValidSubmit} className="form-login" noValidate>
                    <FormGroup>
                        <Label for="login">Логін</Label>
                        <Input
                          name="login"
                          id="login"
                          autoFocus
                          value={this.state.login}
                          invalid={Boolean(this.state.errors.login)}
                          onChange={(e) => this.setState({ login: e.target.value })}
                        />
                        <FormFeedback>{this.state.errors.login}</FormFeedback>
                    </FormGroup>
                    <FormGroup>
                        <Label for="password">Пароль</Label>
                        <Input
                          name="password"
                          id="password"
                          type="password"
                          value={this.state.password}
                          invalid={Boolean(this.state.errors.password)}
                          onChange={(e) => this.setState({ password: e.target.value })}
                        />
                        <FormFeedback>{this.state.errors.password}</FormFeedback>
                    </FormGroup>
                    {/* <Button block type="submit">Увійти</Button> */}
                    <Button
                            style={{width: "100%"}}
                            text="Увійти"
                            type="default"
                            stylingMode="contained"
                            useSubmitBehavior={true}
                        />
                    {/* <Loading visible={this.props.settings.isLoadingLoginShow} type="login" style={{marginTop: "15px"}} /> */}
                    </Form>
                </Card>
                </div>
            </div>
        );
      }
}

export default connect(
    state => ({
      settings : state.settings
    }),
    dispatch => ({
        onLogin: (userData) => {
            dispatch(logIn(userData))
          }
    })
  )(Login);