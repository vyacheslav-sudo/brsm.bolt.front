import React, { Component } from 'react';
import Form, {
    SimpleItem,
    Label,
    CompareRule,
    PatternRule,
    RequiredRule,
    ButtonItem
  } from 'devextreme-react/form';
import notify from 'devextreme/ui/notify';
import '../settings.css';
import { coreApi } from '../../api/clientApi';
import { connect } from 'react-redux';
function generateApiPassword(length = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = new Uint32Array(length);
    window.crypto.getRandomValues(bytes);
    let result = '';

    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }

    return result;
}

class AddUser extends Component {  

     constructor(props) {
         super(props); 
         this.form = React.createRef();                  
         this.state = {
            user : {
                userTypeId : null,
                userName : '',                   
                password : ''                 
            },
            isShowPassword : true
         }

         this.passwordComparison = this.passwordComparison.bind(this);
         this.handleSubmit = this.handleSubmit.bind(this);
         this.cancelClick = this.onCancelClick.bind(this);
         this.formFieldDataChanged = this.formFieldDataChanged.bind(this);              
    }

    changeState(e) {
        this.setState(e);
      }

    handleSubmit(e) {        
        e.preventDefault(); 
        //e.target.reset();

        this.props.onLoading(true);
        coreApi.post('/Account/register', this.state.user)
        .then((response) => {                    
            notify('Користувач успішно створений', 'success', 1000);   
            this.props.onLoading(false);
            //e.target.reset();
            this.form.current.reset();
            this.props.childState({
                mainGrid: true,
                addUser : false
            });        
        })
        .catch((error) => {
            if (error.response && error.response.data.err_descr) {     
                notify(error.response.data.err_descr, 'error', 1000);     
            } 
            else {
                notify('Не вдалося створити користувача', 'error', 1000);
            }                       
            this.props.onLoading(false);
          });
      }

    onCancelClick() {        
        this.form.current.reset();
        this.props.childState({
            mainGrid: true,
            addUser : false
        }); 
    }

    passwordComparison() {
        return this.state.user.password;
      }


    formFieldDataChanged(e) {
        if(e.dataField === 'userTypeId') {
            let _typeUser = this.props.users.userTypes.find(item => item.id === e.value);
            //console.log(_typeUser);
            
            // генерация пароля

            if(_typeUser.type === 'api') {
                let _password = generateApiPassword(10);

                this.setState({ user : {
                    ...this.state.user, 
                        password : _password },
                        isShowPassword : false
                    });
            }
            else if(_typeUser.type === 'web') {
                this.setState({ user : {
                    ...this.state.user, 
                        password : '' },
                        isShowPassword : true
                    });
            }
        }        
    }

  render() {    
    const { user } = this.state;
     return (             
          <div style={{marginTop: "15px", maxWidth: "750px", margin: "auto"}}>
            <div id="addUser">
            <div className="header">Додавання користувача</div>
            <form onSubmit={this.handleSubmit} ref={this.form}>
            <Form
                onFieldDataChanged={this.formFieldDataChanged}
                formData={user}
                readOnly={false}
                showColonAfterLabel={true}
                showValidationSummary={true}                 
                validationGroup="customerData" >
                
                <SimpleItem dataField="userTypeId" editorType="dxSelectBox"  editorOptions={{ dataSource: this.props.users.userTypes, valueExpr : 'id', displayExpr : 'name'}}>                
                    <Label text="Тип користувача"></Label>
                    <RequiredRule message="Обов'язкове поле" />
                </SimpleItem>                
                <SimpleItem dataField="userName" editorType="dxTextBox" editorOptions={{maxLength : 32}}>
                    <Label text="Користувач"></Label>
                    <RequiredRule message="Користувач - обов'язкове поле" />                
                </SimpleItem>  
                <SimpleItem dataField="password" visible={this.state.isShowPassword} editorType="dxTextBox" editorOptions={{mode : "password"}}>
                <Label text="Пароль"></Label>
                    <PatternRule message="Пароль повинен містити щонайменше 6 символів, і повинен містити принаймні одну велику та малу літеру та одну цифру" pattern="^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$" />
                    <RequiredRule message="Пароль - обов'язкове поле" />
                </SimpleItem>
                <SimpleItem editorType="dxTextBox" visible={this.state.isShowPassword} editorOptions={{mode : "password"}}>
                <Label text="Повторіть пароль"></Label>
                    <PatternRule message="Пароль повинен містити щонайменше 6 символів, і повинен містити принаймні одну велику та малу літеру та одну цифру" pattern="^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$" />
                    <RequiredRule message="Повтор паролю - обов'язкове поле" />
                    <CompareRule
                    message="Паролі не збігаються"
                    comparisonTarget={this.passwordComparison}
                    />
                </SimpleItem>

                <ButtonItem  itemType="button"             
                    buttonOptions={{
                        text: 'Зберегти',
                        type: 'success',
                        useSubmitBehavior: true
                    }}
              />
              <ButtonItem itemType="button"              
                buttonOptions={{
                    text: 'Відміна',
                    type: 'normal',
                    onClick : this.onCancelClick.bind(this)
                  }}
              />
              
            </Form>                     
            </form>            
            </div>

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
  )(AddUser);





