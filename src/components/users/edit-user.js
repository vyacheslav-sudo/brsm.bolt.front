import React, { Component } from 'react';
import Form, {
    SimpleItem,
    Label,
    RequiredRule,
    ButtonItem
  } from 'devextreme-react/form';
import TextArea from 'devextreme-react/text-area';
import { Button } from 'devextreme-react/button';
import { Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Input, Label as BsLabel } from 'reactstrap';
import 'devextreme-react/autocomplete';
import notify from 'devextreme/ui/notify';
import '../settings.css';
import { authApi, coreApi } from '../../api/clientApi';
import { connect } from 'react-redux';

class EditUser extends Component {  

     constructor(props) {
         super(props); 
         this.form = React.createRef();
         this.formPassword = React.createRef();         
         this.inputRefreshToken = React.createRef();
         this.state = {
            modalBlockUser : false,
            modalChangePassword : false,
            modalGenerateRefresh : false,
            newRefreshToken : ''
        }     

         this.handleSubmit = this.handleSubmit.bind(this);
         this.handleValidSubmitPassword = this.handleValidSubmitPassword.bind(this);
         this.cancelClick = this.onCancelClick.bind(this);
    }

    changeState(e) {        
        this.setState(e);
      }

    componentDidMount() {
       
    }

    handleSubmit(e) {        
        e.preventDefault(); 
      }

    onCancelClick() {
        this.form.current.reset();        
        this.props.childState({
            mainGrid: true,
            editUser : false
        }); 
    }

    isOpenModalBlockUser() {
        this.setState({
            modalBlockUser : true
        });
    }

    isOpenModalChangePassword() {
        this.setState({
            modalChangePassword : true
        });
    }

    isOpenModalChangeRefresh() {
        this.setState({
            modalGenerateRefresh : true,
            newRefreshToken : ''
        });
    }

    onChangeRefreshToken() {
        this.props.onLoading(true);            
        authApi.post('/Token/emit-terminal-refreshtoken', { UserGuId : this.props.parentState.editUserData.guid })
        .then((response) => {                          
            this.setState({
                newRefreshToken : response.data.refreshToken
            });
            this.props.onLoading(false);
        })
        .catch((error) => {
          this.props.onLoading(false); 
          if (error.response && error.response.data.message) {     
                   notify(error.response.data.message, 'error', 1000);     
                 } 
          else {
                 notify('Не вдалося змінити RefreshToken', 'error', 1000);
             }   
        });
    }

    onBlockUser() {
        this.onCloseModalBlockUser();
        this.props.onLoading(true);
        let newStatus = this.props.parentState.editUserData.isBlocked > 0 ? 0 : 1;        

        coreApi.post("/Account/user-block", { guid : this.props.parentState.editUserData.guid, isBlocked: newStatus})
        .then((response) => {            
            let _user = this.props.parentState.editUserData;
            _user.isBlocked = newStatus;            
            this.props.childState(_user);
            notify('Операція блок/разблок користувача виконана', 'success', 1000);
            this.props.onLoading(false); 
        })
        .catch((error) => {
            if (error.response && error.response.data.err_descr) {     
                notify(error.response.data.err_descr, 'error', 1000);     
            } 
            else {
                notify('Не вдалося виконати операцію', 'error', 1000);
            }                       
            this.props.onLoading(false);
          });
    }

    onCloseModalBlockUser() {
        this.setState({
            modalBlockUser : false
        });
    }

    onCloseModalChangeRefresh() {
        this.setState({
            modalGenerateRefresh : false
        });
    }

    onCloseModalChangePassword() {
        if (this.formPassword.current) {
            this.formPassword.current.reset();
        }
        this.setState({
            modalChangePassword : false
        });
    }

    onKeyPress(event) {
        if (event.which === 13 /* Enter */) {
            event.preventDefault();          
        }
    }

    handleValidSubmitPassword(e) {
        e.preventDefault();

        let _form = this.formPassword.current;        
        if(!_form) {
            return;
        }

        const password = _form.password.value;
        const password2 = _form.password2.value;
        const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$/;

        if(!password || !password2) {
            notify('Вкажіть новий пароль в обох полях', 'error', 1000);
            return;
        }

        if(!passwordPattern.test(password) || !passwordPattern.test(password2)) {
            notify('Пароль повинен містити щонайменше 6 символів, і повинен містити принаймні одну велику та малу літеру та одну цифру', 'error', 1000);
            return;
        }

        if(password !== password2) {
             notify('Паролі повинні збігатися', 'error', 1000);
             return;
        }

        this.onChangePassword(password);
    }

    onChangePassword(password) {
        this.props.onLoading(true);
        coreApi.post('/Account/password-change', 
         {
            guid: this.props.parentState.editUserData.guid,
            password: password
        })
        .then((response) => {               
            notify('Пароль успішно змінено', 'success', 1000);   
            this.props.onLoading(false);
            if (this.formPassword.current) {
                this.formPassword.current.reset();
            }
            this.onCloseModalChangePassword();
        })
        .catch((error) => {
            if (error.response && error.response.data.err_descr) {     
                notify(error.response.data.err_descr, 'error', 1000);     
            } 
            else {
                notify('Не вдалося змінити пароль', 'error', 1000);
            }                       
            this.props.onLoading(false);
          });
      }

  render() {          
     const _user = this.props.users.userTypes.find(item => item.id === this.props.parentState.editUserData.userTypeId);
     const isPassButton = _user.type === 'web' ? true : false;
     const isTokenButton = _user.type === 'api' ? true : false;
     const isBlocked = this.props.parentState.editUserData.isBlocked;
     return (           
          <div style={{marginTop: "15px", maxWidth: "750px", margin: "auto"}}>          
            <div id="editUser">
            <div className="header">Редагування користувача</div>
            <div className="header-buttons">
                {
                    isPassButton ? 
                    <Button icon="key" type="normal" text="Змінити пароль" onClick={this.isOpenModalChangePassword.bind(this)}></Button> : 
                    isTokenButton ? 
                    <Button icon="key" type="normal" text="Змінити ключ доступу" onClick={this.isOpenModalChangeRefresh.bind(this)}></Button> :
                    <></>
                }                                                
                <Button icon="clear" type="normal" text={isBlocked !== undefined && isBlocked > 0 ? 'Розблокувати' : 'Заблокувати'} onClick={this.isOpenModalBlockUser.bind(this)}></Button>
            </div>
            <form onSubmit={this.handleSubmit} ref={this.form}>
            <Form
                formData={this.props.parentState.editUserData}
                readOnly={false}
                showColonAfterLabel={true}
                showValidationSummary={true} 
                validationGroup="customerData" >
                
                <SimpleItem dataField="userTypeId" editorType="dxSelectBox" isRequired={true} editorOptions={
                  {dataSource: this.props.users.userTypes,
                   valueExpr : 'id',
                   displayExpr : 'name',
                   disabled : true}
                  }>                
                    <Label text="Тип користувача"></Label>
                    <RequiredRule message="Обов'язкове поле" />
                </SimpleItem>                
                <SimpleItem dataField="userName" editorType="dxTextBox" editorOptions={{disabled : true}}>
                    <Label text="Користувач"></Label>
                    <RequiredRule message="Користувач - обов'язкове поле" />                
                </SimpleItem> 

                {/* <ButtonItem  itemType="button"             
                    buttonOptions={{
                        text: 'Зберегти',
                        type: 'success',
                        useSubmitBehavior: true
                    }} /> */}
              <ButtonItem itemType="button"              
                buttonOptions={{
                    text: 'Вийти',
                    type: 'normal',
                    onClick : this.onCancelClick.bind(this)
                  }} />

            </Form>                    
            </form>            
            </div>

            <Modal isOpen={this.state.modalBlockUser}>
                    <ModalBody>
                    Ви дійсно бажаєте {this.props.parentState.editUserData.isBlocked > 0 ? 'розблокувати' : 'заблокувати'} користувача?
                    </ModalBody>
                    <ModalFooter>
                    <Button                            
                            text="Так"
                            type="success"
                            stylingMode="contained" 
                            onClick={this.onBlockUser.bind(this)}
                        />{' '}
                        <Button                            
                            text="Ні"
                            type="danger"
                            stylingMode="contained" 
                            onClick={this.onCloseModalBlockUser.bind(this)}
                        />
                    </ModalFooter>
                </Modal>


                <Modal isOpen={this.state.modalChangePassword}>
                    <ModalHeader>Змінити пароль</ModalHeader>
                    <ModalBody id="user-tabs-change-password">
                    <form onKeyPress={this.onKeyPress} onSubmit={this.handleValidSubmitPassword} className="pl-2 form-change-password" ref={this.formPassword}>
                        <FormGroup>
                            <BsLabel for="password">Пароль</BsLabel>
                            <Input name="password" id="password" type="password" />
                        </FormGroup>
                        <FormGroup>
                            <BsLabel for="password2">Повторіть пароль</BsLabel>
                            <Input name="password2" id="password2" type="password" />
                        </FormGroup>
                    <div style={{display : "flex", flexDirection: "row", alignItems : "center"}}>
                        <Button                            
                            text="Змінити"
                            type="success"
                            stylingMode="contained" 
                            useSubmitBehavior={true}
                        />{' '}
                        <Button                            
                            text="Відміна"
                            type="normal"
                            stylingMode="contained" 
                            onClick={this.onCloseModalChangePassword.bind(this)}
                        />
                    </div>
                </form>
                </ModalBody>                    
                </Modal>    


                <Modal isOpen={this.state.modalGenerateRefresh}>
                    <ModalHeader>Змінити ключ доступу</ModalHeader>
                    <ModalBody>                        
                        <FormGroup className="pl-2 form-change-password">
                            <BsLabel for="newRefreshToken">Новий ключ доступу</BsLabel>
                            <Input
                            value={this.state.newRefreshToken}                            
                            name="newRefreshToken" 
                            id="newRefreshToken" 
                            type="text"
                            readOnly={true}
                             />
                            <i>УВАГА! Старий ключ доступу стане недійсним</i>
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                    <Button                            
                            text="Змінити"
                            type="success"
                            stylingMode="contained" 
                            onClick={this.onChangeRefreshToken.bind(this)}
                        />{' '}
                        <Button                            
                            text="Закрити"
                            type="danger"
                            stylingMode="contained" 
                            onClick={this.onCloseModalChangeRefresh.bind(this)}
                        />
                    </ModalFooter>                   
                </Modal> 

            {/* просто чтобы VS Code не давал предупреждения */}
            <TextArea visible={false} />

          </div>
     );
   }
}

export default connect(
    state => ({
      auth: state.auth,
      users: state.users    
    }),
    dispatch => ({
        onLoading(item) {
            dispatch({type: 'LOADING_SHOW', payload: item});
        }
    })
  )(EditUser);
