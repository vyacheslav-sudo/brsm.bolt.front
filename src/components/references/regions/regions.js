import React, { Component } from 'react';
import { connect } from 'react-redux';
import DataGrid, {
  Column,
  Export,
  Pager,
  Paging,
  SearchPanel,
  StateStoring
} from 'devextreme-react/data-grid';
import notify from 'devextreme/ui/notify';
import { checkAccessRoute } from '../../../actions/auth';
import { coreApi } from '../../../api/clientApi';

class Regions extends Component {
  state = {
    dataGrid: []
  };

  componentDidMount() {
    checkAccessRoute(this.props);
    this.onExecute();
  }

  getErrorMessage(error, defaultMessage) {
    if (error && error.response && error.response.data && error.response.data.message) {
      return error.response.data.message;
    }

    return defaultMessage;
  }

  onExecute = () => {
    this.props.onLoading(true);

    coreApi.get('/region', {
      params: {
        includeDeleted: true
      }
    }).then((response) => {
      this.props.onLoading(false);
      this.setState({
        dataGrid: response.data || []
      });
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося завантажити дані'), 'error');
    });
  };

  clearFilterDataGrid = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.clearFilter();
      this.dataGrid.instance.searchByText('');
    }
  };

  prepareToolbar = (e) => {
    const exportBtnItem = e.toolbarOptions.items.find((item) => item.name === 'exportButton');
    const otherItems = e.toolbarOptions.items.filter((item) => item.name !== 'exportButton');

    if (!exportBtnItem) {
      return;
    }

    e.toolbarOptions.items = [
      {
        location: 'after',
        widget: 'dxButton',
        options: {
          icon: 'refresh',
          hint: 'Оновити',
          onClick: this.onExecute
        }
      },
      {
        location: 'after',
        widget: 'dxButton',
        options: {
          icon: 'notequal',
          hint: 'Очистити всі фільтри',
          onClick: this.clearFilterDataGrid
        }
      },
      {
        location: 'after',
        locateInMenu: 'auto',
        widget: 'dxButton',
        options: {
          text: 'В Excel',
          icon: 'export-excel-button',
          hint: 'Експорт в Excel',
          elementAttr: {
            class: 'dx-datagrid-export-button'
          },
          onClick() {
            e.component.exportToExcel(false);
          }
        }
      },
      ...otherItems
    ];
  };

  render() {
    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{ marginTop: '20px' }}>
          <DataGrid
            ref={(ref) => { this.dataGrid = ref; }}
            id="gridRegions"
            keyExpr="id"
            dataSource={this.state.dataGrid}
            allowColumnReordering
            allowColumnResizing
            columnAutoWidth
            showBorders
            rowAlternationEnabled
            onToolbarPreparing={this.prepareToolbar}
            filterRow={{ applyFilter: true, visible: true }}
          >
            <Export enabled fileName="Regions" />
            <SearchPanel visible />
            <StateStoring enabled type="localStorage" storageKey="Regions" />
            <Paging defaultPageSize={50} />
            <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50]} showInfo />
            <Column dataField="id" caption="ID" width={90} />
            <Column dataField="name" caption="Назва" />
            <Column dataField="boltRegionId" caption="Bolt Region ID" width={140} />
            <Column dataField="defaultRegion" caption="Регіон за замовчуванням" dataType="boolean" />
            <Column dataField="deleted" caption="Видалений" dataType="boolean" />
            <Column dataField="lastExchangeCheck" caption="Остання перевірка обміну" dataType="datetime" />
            <Column dataField="lastRegistrationPacket" caption="Останній пакет реєстрації" dataType="number" />
            <Column dataField="lastSuccessfulExchangePacket" caption="Останній успішний пакет" dataType="number" />
            <Column dataField="editDate" caption="Дата редаг." dataType="datetime" />
          </DataGrid>
        </div>
      </div>
    );
  }
}

export default connect(
  (state) => ({
    auth: state.auth,
    users: state.users,
    settings: state.settings,
    router: state.router
  }),
  (dispatch) => ({
    onLoading(item) {
      dispatch({ type: 'LOADING_SHOW', payload: item });
    }
  })
)(Regions);
