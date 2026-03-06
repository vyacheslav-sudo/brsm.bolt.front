import React, { Component } from 'react';
import { connect } from 'react-redux';
import Moment from 'moment';
import DataGrid, {
  Column,
  ColumnChooser,
  Export,
  Lookup,
  MasterDetail,
  Pager,
  Paging,
  SearchPanel,
  StateStoring
} from 'devextreme-react/data-grid';
import { TabPanel } from 'devextreme-react/tab-panel';
import { Item } from 'devextreme-react/form';
import { Button } from 'devextreme-react/button';
import notify from 'devextreme/ui/notify';
import { JsonToTable } from 'react-json-to-table';
import { checkAccessRoute } from '../../actions/auth';
import { coreApi } from '../../api/clientApi';
import DatFromDatTo from '../other/dateFromDateTo';

const BOLT_STATUS_LABELS = {
  RECEIVED: 'Отримано',
  CANCELLED: 'Скасовано'
};

const AZK_STATUS_LABELS = {
  UNKNOWN: 'Невідомо',
  PENDING_ACCEPT: 'Очікує підтвердження',
  ACCEPTED: 'Підтверджено',
  PENDING_REJECT: 'Очікує скасування',
  REJECTED: 'Скасовано',
  PENDING_READY_FOR_PICKUP: 'Очікує готовності',
  READY_FOR_PICKUP: 'Готово до видачі',
  PICKED_UP: 'Видано'
};

function safeParseJson(value) {
  if (!value || typeof value !== 'string') {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return {
      raw: value
    };
  }
}

function prettifyStatus(value) {
  if (!value) {
    return '';
  }

  return value
    .split('_')
    .map((item) => item.charAt(0) + item.slice(1).toLowerCase())
    .join(' ');
}

function mapStatusDisplayName(type, value) {
  if (!value) {
    return '';
  }

  if (type === 'bolt') {
    return BOLT_STATUS_LABELS[value] || prettifyStatus(value);
  }

  return AZK_STATUS_LABELS[value] || prettifyStatus(value);
}

function buildStatusLookup(rows, fieldName, type) {
  return Array.from(
    new Set(
      rows
        .map((item) => item[fieldName])
        .filter((item) => item !== null && item !== undefined && item !== '')
    )
  )
    .sort()
    .map((item, index) => ({
      id: index + 1,
      name: item,
      displayName: mapStatusDisplayName(type, item)
    }));
}

function getStatusBadgeStyle(value) {
  if (!value) {
    return {
      backgroundColor: '#eef1f4',
      color: '#495057'
    };
  }

  const status = String(value).toUpperCase();

  if (status === 'CANCELLED' || status === 'REJECTED') {
    return {
      backgroundColor: '#f8d7da',
      color: '#842029'
    };
  }

  if (
    status === 'UNKNOWN' ||
    status === 'PENDING_ACCEPT' ||
    status === 'PENDING_REJECT' ||
    status === 'PENDING_READY_FOR_PICKUP'
  ) {
    return {
      backgroundColor: '#fff3cd',
      color: '#8a6d3b'
    };
  }

  if (status === 'ACCEPTED' || status === 'READY_FOR_PICKUP' || status === 'PICKED_UP') {
    return {
      backgroundColor: '#d7f2df',
      color: '#1d6b34'
    };
  }

  if (status === 'RECEIVED') {
    return {
      backgroundColor: '#d8ebfb',
      color: '#1b5f97'
    };
  }

  return {
    backgroundColor: '#eef1f4',
    color: '#495057'
  };
}

function StatusBadge({ value, type }) {
  if (!value) {
    return <span className="text-muted">-</span>;
  }

  const style = getStatusBadgeStyle(value);

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        ...style
      }}
    >
      {mapStatusDisplayName(type, value)}
    </span>
  );
}

class BoltOrders extends Component {
  constructor(props) {
    super(props);

    this.state = {
      dateFrom: Moment(new Date()).add(-3, 'days'),
      dateTo: Moment(new Date()).add(1, 'days'),
      dataGrid: [],
      terminals: [],
      boltStatuses: [],
      azkStatuses: []
    };
  }

  componentDidMount() {
    checkAccessRoute(this.props);
    this.onExecute();
  }

  onChangeDates(e) {
    this.setState({
      dateFrom: e.dateFrom,
      dateTo: e.dateTo
    });
  }

  async onExecute() {
    this.props.onLoading(true);

    const dateFrom = Moment(this.state.dateFrom).format('YYYY-MM-DD');
    const dateTo = Moment(this.state.dateTo).format('YYYY-MM-DD');

    try {
      const [terminalsResponse, ordersResponse] = await Promise.all([
        coreApi.get('/terminal/short'),
        coreApi.get(`/boltorder?from=${dateFrom}&to=${dateTo}`)
      ]);

      const dataGrid = ordersResponse.data.map((item) => ({
        ...item,
        providerIdTerm: item.providerId,
        boltOrderData: safeParseJson(item.rawData),
        manualAcceptedData:
          item.terminalOutWarning === true ||
          item.terminalOutWarning2 === true ||
          item.terminalOutWarningAccepted === true
            ? [
                {
                  id: item.id,
                  terminalOutWarning: Boolean(item.terminalOutWarning),
                  terminalOutWarningDate: item.terminalOutWarningDate,
                  terminalOutWarning2: Boolean(item.terminalOutWarning2),
                  terminalOutWarningDate2: item.terminalOutWarningDate2,
                  terminalOutWarningAccepted: Boolean(item.terminalOutWarningAccepted),
                  terminalOutWarningManagerName: item.terminalOutWarningManagerName,
                  terminalOutWarningAcceptedDateTime: item.terminalOutWarningAcceptedDateTime
                }
              ]
            : [],
        updatesPrepared: (item.updates || []).map((update) => ({
          ...update,
          rawDataParsed: safeParseJson(update.rawData)
        }))
      }));

      this.setState({
        terminals: terminalsResponse.data,
        dataGrid,
        boltStatuses: buildStatusLookup(dataGrid, 'boltStatus', 'bolt'),
        azkStatuses: buildStatusLookup(dataGrid, 'azkOrderStatus', 'azk')
      });
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        notify(error.response.data.message, 'error');
      } else {
        notify('Не вдалося завантажити дані', 'error');
      }
    } finally {
      this.props.onLoading(false);
    }
  }

  clearFilterDataGrid() {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.clearFilter();
      this.dataGrid.instance.clearSorting();
      this.dataGrid.instance.searchByText('');
    }
  }

  onToolbarPreparing(e) {
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
        widget: 'dxButton',
        options: {
          icon: 'refresh',
          hint: 'Оновити',
          onClick: this.onExecute.bind(this)
        }
      },
      {
        location: 'after',
        widget: 'dxButton',
        options: {
          icon: 'notequal',
          hint: 'Очистити всі фільтри',
          onClick: this.clearFilterDataGrid.bind(this)
        }
      },
      {
        location: 'before',
        widget: 'dxButton',
        options: {
          icon: 'download',
          text: 'Завантажити',
          hint: 'Завантажити дані',
          onClick: this.onExecute.bind(this)
        }
      }
    );
  }

  displayTermExpr(item) {
    return item && `${item.id} ${item.name}`;
  }

  displayLookupExpr(item) {
    return item && `${item.displayName}`;
  }

  orderManagerAccept(e) {
    this.props.onLoading(true);

    coreApi
      .put(`/boltorder/TakeToWork/${e.data.id}`, {})
      .then(() => {
        notify('Замовлення прийнято', 'success', 1000);
        this.onExecute();
      })
      .catch((error) => {
        if (error.response && error.response.data && error.response.data.message) {
          notify(error.response.data.message, 'error');
        } else {
          notify('Не вдалося виконати запит', 'error');
        }
      })
      .finally(() => {
        this.props.onLoading(false);
      });
  }

  cellButtonAcceptRequest(e) {
    const isShowButton = (e.data.terminalOutWarning || e.data.terminalOutWarning2) && !e.data.terminalOutWarningAccepted;

    if (!isShowButton) {
      return null;
    }

    return (
      <div style={{ width: '100%', textAlign: 'center' }}>
        <Button
          id="accept-manual-order-button"
          text="Прийняти"
          type="normal"
          stylingMode="contained"
          onClick={this.orderManagerAccept.bind(this, e)}
        />
      </div>
    );
  }

  renderManualAcceptedDataTab(e) {
    return (
      <div className="detail-tab-content">
        <DataGrid
          dataSource={e.data.data.manualAcceptedData}
          keyExpr="id"
          allowColumnResizing
          columnAutoWidth
          showBorders
          rowAlternationEnabled
          filterRow={{ applyFilter: true, visible: true }}
        >
          <Paging defaultPageSize={15} />
          <Pager showPageSizeSelector allowedPageSizes={[15, 25, 50, 100]} showInfo />
          <Column dataField="terminalOutWarning" caption="Попередження 1" dataType="boolean" />
          <Column dataField="terminalOutWarningDate" caption="Дата попередження 1" dataType="datetime" />
          <Column dataField="terminalOutWarning2" caption="Попередження 2" dataType="boolean" />
          <Column dataField="terminalOutWarningDate2" caption="Дата попередження 2" dataType="datetime" />
          <Column dataField="terminalOutWarningAccepted" caption="Підтверджено менеджером" dataType="boolean" />
          <Column dataField="terminalOutWarningManagerName" caption="Менеджер" />
          <Column dataField="terminalOutWarningAcceptedDateTime" caption="Дата підтвердження" dataType="datetime" />
          <Column cellRender={this.cellButtonAcceptRequest.bind(this)} width={120} />
        </DataGrid>
      </div>
    );
  }

  renderHistoryOrderTab(e) {
    return (
      <div className="detail-tab-content">
        <DataGrid
          dataSource={e.data.data.history || []}
          keyExpr="id"
          allowColumnResizing
          columnAutoWidth
          showBorders
          rowAlternationEnabled
          filterRow={{ applyFilter: true, visible: true }}
        >
          <Paging defaultPageSize={15} />
          <Pager showPageSizeSelector allowedPageSizes={[15, 25, 50, 100]} showInfo />
          <Column dataField="id" caption="ID" width={90} />
          <Column dataField="action" caption="Опис" />
          <Column dataField="editDate" caption="Дата" dataType="datetime" />
        </DataGrid>
      </div>
    );
  }

  renderUpdatesRawData(updateRow) {
    return (
      <div className="detail-tab-content" style={{ width: '75vw', maxWidth: '1400px' }}>
        <JsonToTable json={this.formatKeys(updateRow.data.data.rawDataParsed || {})} />
      </div>
    );
  }

  renderUpdatesTab(e) {
    return (
      <div className="detail-tab-content">
        <DataGrid
          dataSource={e.data.data.updatesPrepared || []}
          keyExpr="id"
          allowColumnResizing
          columnAutoWidth
          showBorders
          rowAlternationEnabled
          filterRow={{ applyFilter: true, visible: true }}
        >
          <Paging defaultPageSize={15} />
          <Pager showPageSizeSelector allowedPageSizes={[15, 25, 50, 100]} showInfo />
          <Column dataField="id" caption="ID" width={90} />
          <Column dataField="requestType" caption="Тип оновлення" />
          <Column dataField="editDate" caption="Дата" dataType="datetime" />
          <MasterDetail enabled component={this.renderUpdatesRawData.bind(this)} />
        </DataGrid>
      </div>
    );
  }

  renderExtInfoOrderTab(e) {
    const data = e.data.data.boltOrderData || {};

    return (
      <div className="detail-tab-content" style={{ width: '75vw', maxWidth: '1400px' }}>
        <JsonToTable json={this.formatKeys(data)} />
      </div>
    );
  }

  formatKeys(obj) {
    const formattedObj = {};

    Object.keys(obj).forEach((key) => {
      const newKey = key.replaceAll('_', ' ').toUpperCase();
      const value = obj[key];

      if (Array.isArray(value)) {
        formattedObj[newKey] = value.map((item) => {
          if (item && typeof item === 'object') {
            return this.formatKeys(item);
          }

          return item;
        });
        return;
      }

      if (value && typeof value === 'object') {
        formattedObj[newKey] = this.formatKeys(value);
        return;
      }

      formattedObj[newKey] = value;
    });

    return formattedObj;
  }

  OrdersDetailed(e) {
    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <b>Додаткова інформація про замовлення</b>
        </div>
        <TabPanel>
          <Item title="Ручне підтвердження" render={this.renderManualAcceptedDataTab.bind(this, e)} />
          <Item title="Історія" render={this.renderHistoryOrderTab.bind(this, e)} />
          <Item title="Оновлення" render={this.renderUpdatesTab.bind(this, e)} />
          <Item title="Bolt замовлення" render={this.renderExtInfoOrderTab.bind(this, e)} />
        </TabPanel>
      </div>
    );
  }

  onRowPrepared(e) {
    if (e.rowType !== 'data') {
      return;
    }

    const hasWarning = (e.data.terminalOutWarning || e.data.terminalOutWarning2) && !e.data.terminalOutWarningAccepted;
    const hasSyncIssue =
      e.data.packetOut === null ||
      e.data.packetIn === null ||
      (e.data.packetOut !== null && e.data.packetIn !== null && e.data.packetOut > e.data.packetIn);

    if (!hasWarning && !hasSyncIssue) {
      return;
    }

    const cells = e.rowElement.querySelectorAll('td');

    for (let index = 0; index < cells.length; index += 1) {
      cells[index].style.backgroundColor = hasWarning ? '#FF7276' : '#FBBF77';
    }
  }

  render() {
    return (
      <div style={{ marginTop: '20px' }}>
        <DatFromDatTo
          defaultDateFrom={this.state.dateFrom}
          defaultDateTo={this.state.dateTo}
          onChangeDates={this.onChangeDates.bind(this)}
        />
        <div style={{ marginTop: '20px' }}>
          <DataGrid
            ref={(ref) => {
              this.dataGrid = ref;
            }}
            id="gridBoltOrders"
            keyExpr="id"
            dataSource={this.state.dataGrid}
            allowColumnReordering
            allowColumnResizing
            columnAutoWidth
            showBorders
            rowAlternationEnabled
            onRowPrepared={this.onRowPrepared.bind(this)}
            onToolbarPreparing={this.onToolbarPreparing.bind(this)}
            filterRow={{ applyFilter: true, visible: true }}
          >
            <Export enabled fileName="BoltOrders" />
            <SearchPanel visible />
            <ColumnChooser enabled />
            <StateStoring enabled type="localStorage" storageKey="BoltOrders" />
            <Paging defaultPageSize={50} />
            <Pager showPageSizeSelector allowedPageSizes={[50, 100, 300]} showInfo />
            <Column dataField="orderId" caption="ID замовлення" />
            <Column dataField="providerId" caption="Provider ID" visible={false} />
            <Column dataField="providerIdTerm" caption="АЗК">
              <Lookup dataSource={this.state.terminals} valueExpr="providerId" displayExpr={this.displayTermExpr} />
            </Column>
            <Column
              dataField="boltStatus"
              caption="Статус Bolt"
              cellRender={(cell) => <StatusBadge value={cell.value} type="bolt" />}
            >
              <Lookup dataSource={this.state.boltStatuses} valueExpr="name" displayExpr={this.displayLookupExpr} />
            </Column>
            <Column
              dataField="azkOrderStatus"
              caption="Статус АЗК"
              cellRender={(cell) => <StatusBadge value={cell.value} type="azk" />}
            >
              <Lookup dataSource={this.state.azkStatuses} valueExpr="name" displayExpr={this.displayLookupExpr} />
            </Column>
            <Column dataField="createdDate" caption="Створено" dataType="datetime" />
            <Column dataField="receivedDate" caption="Отримано" dataType="datetime" />
            <Column dataField="statusDate" caption="Дата статусу" dataType="datetime" />
            <Column dataField="estimatedPickupTime" caption="Очікуваний час отримання" dataType="datetime" />
            <Column dataField="orderReferenceId" caption="Reference ID" />
            <Column dataField="totalOrderPrice" caption="Вартість, грн." dataType="number" format="#,##0.00" />
            <Column dataField="courierPartialName" caption="Кур'єр" />
            <Column dataField="courierPhone" caption="Телефон кур'єра" />
            <Column dataField="courierExpectedArrival" caption="Очікування кур'єра" dataType="datetime" visible={false} />
            <Column dataField="lastAzkSynchronizedDate" caption="Остання синхр. з АЗК" dataType="datetime" />
            <Column dataField="packetOut" caption="Packet Out" visible={false} />
            <Column dataField="packetIn" caption="Packet In" visible={false} />
            <Column dataField="editDate" caption="Дата редаг." dataType="datetime" />
            <MasterDetail enabled component={this.OrdersDetailed.bind(this)} />
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
)(BoltOrders);
