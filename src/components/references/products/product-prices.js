import React, { Component } from 'react';
import { connect } from 'react-redux';
import DataGrid, {
  Column,
  ColumnChooser,
  Editing,
  Export,
  Form,
  Pager,
  Paging,
  Popup,
  SearchPanel,
  StateStoring
} from 'devextreme-react/data-grid';
import { Item as FormItem } from 'devextreme-react/form';
import notify from 'devextreme/ui/notify';
import { checkAccessRoute } from '../../../actions/auth';
import { coreApi } from '../../../api/clientApi';

const MEASURE_OPTIONS = [
  { id: 'piece', name: 'Штука' },
  { id: 'gram', name: 'Грам' },
  { id: 'mililitre', name: 'Мілілітр' },
  { id: 'kg', name: 'Кілограм' },
  { id: 'litre', name: 'Літр' }
];

function normalizePrice(item) {
  return {
    ...item,
    availability: item.availability !== undefined ? Boolean(item.availability) : true,
    measure: item.measure || 'piece'
  };
}

function buildPricePayload(data) {
  return {
    terminalId: Number(data.terminalId),
    productId: Number(data.productId),
    dateFrom: data.dateFrom,
    price: data.price === '' || data.price === null || data.price === undefined ? 0 : Number(data.price),
    measure: data.measure || 'piece',
    availability: data.availability !== undefined ? Boolean(data.availability) : true
  };
}

class ProductPrices extends Component {
  constructor(props) {
    super(props);

    this.state = {
      dataGrid: [],
      products: [],
      terminals: []
    };
  }

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

  onExecute = async () => {
    this.props.onLoading(true);

    try {
      const [pricesResponse, productsResponse, terminalsResponse] = await Promise.all([
        coreApi.get('/pimproductprice'),
        coreApi.get('/pimproduct'),
        coreApi.get('/terminal')
      ]);

      this.setState({
        dataGrid: (pricesResponse.data || []).map((item) => normalizePrice(item)),
        products: Array.isArray(productsResponse.data) ? productsResponse.data : [],
        terminals: Array.isArray(terminalsResponse.data) ? terminalsResponse.data : []
      });
    } catch (error) {
      notify(this.getErrorMessage(error, 'Не вдалося завантажити дані'), 'error');
    } finally {
      this.props.onLoading(false);
    }
  };

  onInitNewRow = (e) => {
    e.data.dateFrom = new Date();
    e.data.measure = 'piece';
    e.data.availability = true;
  };

  savePrice = (request, successMessage) => {
    this.props.onLoading(true);

    return request.then(() => {
      notify(successMessage, 'success', 1200);
      this.props.onLoading(false);
      this.onExecute();
      return false;
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося зберегти дані'), 'error');
      return true;
    });
  };

  onRowInserting = (e) => {
    e.cancel = this.savePrice(
      coreApi.post('/pimproductprice', buildPricePayload(e.data)),
      'Ціну додано'
    );
  };

  onRowUpdating = (e) => {
    e.cancel = this.savePrice(
      coreApi.put('/pimproductprice', {
        id: e.oldData.id,
        ...buildPricePayload({
          ...e.oldData,
          ...e.newData
        })
      }),
      'Ціну оновлено'
    );
  };

  onRowRemoving = (e) => {
    this.props.onLoading(true);

    e.cancel = coreApi.delete(`/pimproductprice/${e.data.id}`)
      .then(() => {
        notify('Ціну видалено', 'success', 1200);
        this.props.onLoading(false);
        this.onExecute();
        return false;
      })
      .catch((error) => {
        this.props.onLoading(false);
        notify(this.getErrorMessage(error, 'Не вдалося видалити ціну'), 'error');
        return true;
      });
  };

  onPopupSave = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.saveEditData();
    }
  };

  onPopupCancel = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.cancelEditData();
    }
  };

  clearFilterDataGrid = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.clearFilter();
      this.dataGrid.instance.clearSorting();
      this.dataGrid.instance.searchByText('');
    }
  };

  onAddPrice = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.addRow();
    }
  };

  productLookupExpr = (item) => {
    if (!item) {
      return '';
    }

    return item.localName ? `${item.id} ${item.localName}` : String(item.id);
  };

  terminalLookupExpr = (item) => {
    if (!item) {
      return '';
    }

    return item.providerId ? `${item.name} (${item.providerId})` : item.name;
  };

  measureLookupExpr = (item) => (item ? item.name : '');

  onToolbarPreparing = (e) => {
    e.toolbarOptions.items = e.toolbarOptions.items.filter((item) => item.name !== 'addRowButton');

    const exportButton = e.toolbarOptions.items.find((item) => item.name === 'exportButton');
    const exportIndex = e.toolbarOptions.items.indexOf(exportButton);

    if (exportIndex >= 0) {
      e.toolbarOptions.items[exportIndex] = {
        location: 'after',
        locateInMenu: 'auto',
        sortIndex: 30,
        widget: 'dxButton',
        options: {
          text: 'В Excel',
          icon: 'export-excel-button',
          hint: 'Експорт в Excel',
          elementAttr: {
            class: 'dx-datagrid-export-button'
          },
          onClick: () => e.component.exportToExcel(false)
        }
      };
    }

    e.toolbarOptions.items.unshift(
      {
        location: 'after',
        sortIndex: 5,
        widget: 'dxButton',
        options: {
          icon: 'plus',
          hint: 'Додати ціну',
          onClick: this.onAddPrice
        }
      },
      {
        location: 'after',
        sortIndex: 10,
        widget: 'dxButton',
        options: {
          icon: 'refresh',
          hint: 'Оновити',
          onClick: this.onExecute
        }
      },
      {
        location: 'after',
        sortIndex: 20,
        widget: 'dxButton',
        options: {
          icon: 'notequal',
          hint: 'Очистити всі фільтри',
          onClick: this.clearFilterDataGrid
        }
      }
    );
  };

  render() {
    return (
      <div style={{ marginTop: '20px' }}>
        <DataGrid
          ref={(ref) => {
            this.dataGrid = ref;
          }}
          id="gridProductPrices"
          keyExpr="id"
          dataSource={this.state.dataGrid}
          onInitNewRow={this.onInitNewRow}
          onRowInserting={this.onRowInserting}
          onRowUpdating={this.onRowUpdating}
          onRowRemoving={this.onRowRemoving}
          allowColumnReordering
          allowColumnResizing
          columnAutoWidth
          showBorders
          rowAlternationEnabled
          onToolbarPreparing={this.onToolbarPreparing}
          filterRow={{ visible: true, applyFilter: 'auto' }}
        >
          <Editing
            mode="popup"
            useIcons
            allowAdding
            allowUpdating
            allowDeleting
          >
            <Popup
              title="Додавання/редагування ціни"
              showTitle
              width={620}
              height={470}
              toolbarItems={[
                {
                  toolbar: 'bottom',
                  location: 'after',
                  widget: 'dxButton',
                  options: {
                    text: 'Зберегти',
                    type: 'success',
                    stylingMode: 'contained',
                    onClick: this.onPopupSave
                  }
                },
                {
                  toolbar: 'bottom',
                  location: 'after',
                  widget: 'dxButton',
                  options: {
                    text: 'Вийти',
                    type: 'normal',
                    stylingMode: 'contained',
                    onClick: this.onPopupCancel
                  }
                }
              ]}
            />
            <Form>
              <FormItem itemType="group" colCount={2} colSpan={2}>
                <FormItem
                  dataField="productId"
                  isRequired
                  editorType="dxSelectBox"
                  editorOptions={{
                    dataSource: this.state.products,
                    valueExpr: 'id',
                    displayExpr: this.productLookupExpr,
                    searchEnabled: true
                  }}
                />
                <FormItem
                  dataField="terminalId"
                  isRequired
                  editorType="dxSelectBox"
                  editorOptions={{
                    dataSource: this.state.terminals,
                    valueExpr: 'id',
                    displayExpr: this.terminalLookupExpr,
                    searchEnabled: true
                  }}
                />
                <FormItem dataField="dateFrom" isRequired editorType="dxDateBox" editorOptions={{ type: 'datetime' }} />
                <FormItem dataField="price" isRequired editorType="dxNumberBox" editorOptions={{ min: 0, showSpinButtons: true }} />
                <FormItem
                  dataField="measure"
                  isRequired
                  editorType="dxSelectBox"
                  editorOptions={{
                    dataSource: MEASURE_OPTIONS,
                    valueExpr: 'id',
                    displayExpr: this.measureLookupExpr
                  }}
                />
                <FormItem dataField="availability" editorType="dxCheckBox" />
              </FormItem>
            </Form>
          </Editing>
          <Export enabled fileName="PimProductPrices" />
          <SearchPanel visible />
          <ColumnChooser enabled />
          <StateStoring enabled type="localStorage" storageKey="PimProductPrices" />
          <Paging defaultPageSize={50} />
          <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50, 100]} showInfo />
          <Column dataField="id" caption="ID" width={90} allowEditing={false} />
          <Column
            dataField="productId"
            caption="Продукт"
            lookup={{
              dataSource: this.state.products,
              valueExpr: 'id',
              displayExpr: this.productLookupExpr
            }}
          />
          <Column
            dataField="terminalId"
            caption="АЗК"
            lookup={{
              dataSource: this.state.terminals,
              valueExpr: 'id',
              displayExpr: this.terminalLookupExpr
            }}
          />
          <Column dataField="dateFrom" caption="Дата з" dataType="datetime" />
          <Column dataField="price" caption="Ціна" dataType="number" format="#,##0.00" />
          <Column
            dataField="measure"
            caption="Одиниця"
            lookup={{
              dataSource: MEASURE_OPTIONS,
              valueExpr: 'id',
              displayExpr: this.measureLookupExpr
            }}
          />
          <Column dataField="availability" caption="Доступність" dataType="boolean" />
          <Column dataField="editDate" caption="Дата редаг." dataType="datetime" allowEditing={false} />
        </DataGrid>
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
)(ProductPrices);
