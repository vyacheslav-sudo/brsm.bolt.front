import React, { Component } from 'react';
import DataGrid, { Column, ColumnChooser, StateStoring, Export, Lookup, Paging, Pager } from 'devextreme-react/data-grid';
import '../settings.css';
import { coreApi } from '../../api/clientApi';
import { connect } from 'react-redux';
import notify from 'devextreme/ui/notify';
import { Button } from 'devextreme-react/button';

class UserList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            userList: []
        };
    }

    onAddUser() {
        this.props.childState({
            mainGrid: false,
            addUser: true
        });
    }

    onEditUser(e) {
        this.props.childState({
            mainGrid: false,
            editUser: true,
            editUserData: {
                guid: e.row.data.id,
                userName: e.row.data.userName,
                userTypeId: e.row.data.userTypeId,
                isBlocked: e.row.data.isBlocked
            }
        });
        e.event.preventDefault();
    }

    componentDidMount() {
        this.getUserData();
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.parentState.mainGrid && this.props.parentState.mainGrid) {
            this.getUserData();
        }
    }

    getUserData() {
        this.props.onLoading(true);
        coreApi.get('/Account/list')
       .then((response) => {
          this.setState({
              userList: response.data.filter(item => item.userTypeId > this.props.auth.UserType)
          });
          this.props.onLoading(false);
       })
       .catch((error) => {
           this.props.onLoading(false);
           if (error.response && error.response.data.message) {
               notify(error.response.data.message, 'error', 1000);
           } else {
               notify('Не вдалося завантажити дані', 'error', 1000);
           }
         });
    }

    calculateBlock(rowData) {
        return rowData.isBlocked === undefined || rowData.isBlocked === 0;
    }

    render() {
        return (
          <div style={{ marginTop: '15px' }}>
            <div id="mainGrid">
                <div className="user-list-actions">
                <Button
                    text="Додати користувача"
                    type="success"
                    stylingMode="contained"
                    onClick={this.onAddUser.bind(this)}
                />
                </div>
                <div className="user-list-grid">
                    <DataGrid
                    id="userGridContainer"
                    dataSource={this.state.userList}
                    allowColumnReordering={true}
                    allowColumnResizing={true}
                    columnAutoWidth={true}
                    showBorders={true}
                    rowAlternationEnabled={true}
                    filterRow={{ applyFilter: true, visible: true }}>
                    <Paging defaultPageSize={50} />
                    <Pager
                        showPageSizeSelector={true}
                        allowedPageSizes={[25, 50, 100]}
                        showInfo={true} />
                    <ColumnChooser enabled={true} />
                    <Export enabled={true} fileName="gridUsers" />
                    <StateStoring enabled={true} type="localStorage" storageKey="gridUsers" />
                    <Column dataField="id" caption="ID" dataType="string" />
                    <Column dataField="userName" caption="Користувач" />
                    <Column dataField="userTypeId" caption="Тип користувача">
                        <Lookup dataSource={this.props.users.userTypes} valueExpr="id" displayExpr="name" />
                    </Column>
                    <Column dataField="isBlocked" dataType="boolean" calculateCellValue={this.calculateBlock} caption="Активний" />
                    <Column
                        type="buttons"
                        buttons={[{
                            hint: 'Редагувати',
                            icon: 'edit',
                            visible: true,
                            onClick: this.onEditUser.bind(this)
                        }]}
                    />
                    </DataGrid>
                </div>
            </div>
          </div>
        );
    }
}

export default connect(
    state => ({
      auth: state.auth,
      users: state.users,
      settings: state.settings
    }),
    dispatch => ({
        onLoading(item) {
            dispatch({ type: 'LOADING_SHOW', payload: item });
        }
    })
  )(UserList);
