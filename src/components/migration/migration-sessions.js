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
import notify from 'devextreme/ui/notify';
import { checkAccessRoute } from '../../actions/auth';
import { coreApi } from '../../api/clientApi';
import DatFromDatTo from '../other/dateFromDateTo';

const STEP_CONFIG = [
  {
    key: 'timetables',
    title: 'Розклад',
    startField: 'timetablesStartDate',
    statusField: 'timetablesStatus',
    descriptionField: 'timetablesStatusDescription',
    endField: 'timetablesEndDate'
  },
  {
    key: 'section',
    title: 'Секції',
    startField: 'sectionStartDate',
    statusField: 'sectionStatus',
    descriptionField: 'sectionStatusDescription',
    endField: 'sectionEndDate'
  },
  {
    key: 'category',
    title: 'Категорії',
    startField: 'categoryStartDate',
    statusField: 'categoryStatus',
    descriptionField: 'categoryStatusDescription',
    endField: 'categoryEndDate'
  },
  {
    key: 'product',
    title: 'Продукти',
    startField: 'productStartDate',
    statusField: 'productStatus',
    descriptionField: 'productStatusDescription',
    endField: 'productEndDate',
    detailsBuilder: (item) => {
      const parts = [];

      if (item.productPacketId) {
        parts.push(`Пакет: ${item.productPacketId}`);
      }

      if (item.boltPacketId) {
        parts.push(`Bolt пакет: ${item.boltPacketId}`);
      }

      if (item.productData) {
        parts.push(item.productData);
      }

      return parts.join(' | ');
    }
  },
  {
    key: 'price',
    title: 'Ціни',
    startField: 'priceStartDate',
    statusField: 'priceStatus',
    descriptionField: 'priceStatusDescription',
    endField: 'priceEndDate',
    detailsBuilder: (item) => {
      const parts = [];

      if (item.priceTerminalsWithUpdates !== null && item.priceTerminalsWithUpdates !== undefined) {
        parts.push(`Терміналів зі змінами: ${item.priceTerminalsWithUpdates}`);
      }

      if (item.priceTerminalProcessSuccess !== null && item.priceTerminalProcessSuccess !== undefined) {
        parts.push(`Успішно: ${item.priceTerminalProcessSuccess}`);
      }

      if (item.priceTerminalProcessFail !== null && item.priceTerminalProcessFail !== undefined) {
        parts.push(`Помилки: ${item.priceTerminalProcessFail}`);
      }

      if (item.priceProcessed !== null && item.priceProcessed !== undefined) {
        parts.push(`Оброблено: ${item.priceProcessed}`);
      }

      return parts.join(' | ');
    }
  },
  {
    key: 'availability',
    title: 'Наявність',
    startField: 'availabilityStartDate',
    statusField: 'availabilityStatus',
    descriptionField: 'availabilityStatusDescription',
    endField: 'availabilityEndDate',
    detailsBuilder: (item) => {
      const parts = [];

      if (item.availabilityTerminalsWithUpdates !== null && item.availabilityTerminalsWithUpdates !== undefined) {
        parts.push(`Терміналів зі змінами: ${item.availabilityTerminalsWithUpdates}`);
      }

      if (item.availabilityTerminalProcessSuccess !== null && item.availabilityTerminalProcessSuccess !== undefined) {
        parts.push(`Успішно: ${item.availabilityTerminalProcessSuccess}`);
      }

      if (item.availabilityTerminalProcessFail !== null && item.availabilityTerminalProcessFail !== undefined) {
        parts.push(`Помилки: ${item.availabilityTerminalProcessFail}`);
      }

      if (item.availabilityProcessed !== null && item.availabilityProcessed !== undefined) {
        parts.push(`Оброблено: ${item.availabilityProcessed}`);
      }

      return parts.join(' | ');
    }
  },
  {
    key: 'discount',
    title: 'Знижки',
    startField: 'discountStartDate',
    statusField: 'discountStatus',
    descriptionField: 'discountStatusDescription',
    endField: 'discountEndDate',
    detailsBuilder: (item) => {
      const parts = [];

      if (item.discountTerminalsWithUpdates !== null && item.discountTerminalsWithUpdates !== undefined) {
        parts.push(`Терміналів зі змінами: ${item.discountTerminalsWithUpdates}`);
      }

      if (item.discountTerminalProcessSuccess !== null && item.discountTerminalProcessSuccess !== undefined) {
        parts.push(`Успішно: ${item.discountTerminalProcessSuccess}`);
      }

      if (item.discountTerminalProcessFail !== null && item.discountTerminalProcessFail !== undefined) {
        parts.push(`Помилки: ${item.discountTerminalProcessFail}`);
      }

      if (item.discountProcessed !== null && item.discountProcessed !== undefined) {
        parts.push(`Оброблено: ${item.discountProcessed}`);
      }

      return parts.join(' | ');
    }
  },
  {
    key: 'menu',
    title: 'Меню',
    startField: 'menuStartDate',
    statusField: 'menuStatus',
    descriptionField: 'menuStatusDescription',
    endField: 'menuEndDate',
    detailsBuilder: (item) => (item.lastStateDate ? `Останній стан: ${formatDate(item.lastStateDate)}` : '')
  }
];

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('uk-UA');
}

function getStatusBadgeStyle(status) {
  const value = (status || '').toLowerCase();

  if (value.includes('усп') || value.includes('success')) {
    return {
      backgroundColor: '#d7f2df',
      color: '#1d6b34'
    };
  }

  if (value.includes('помил') || value.includes('error') || value.includes('failed') || value.includes('cancel')) {
    return {
      backgroundColor: '#f8d7da',
      color: '#842029'
    };
  }

  if (value.includes('progress') || value.includes('оброб') || value.includes('викону')) {
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

function StatusBadge({ value }) {
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
      {value}
    </span>
  );
}

function buildStepRows(item) {
  return STEP_CONFIG.map((step) => ({
    id: step.key,
    title: step.title,
    startDate: item[step.startField] || null,
    status: item[step.statusField] || '',
    description: item[step.descriptionField] || '',
    endDate: item[step.endField] || null,
    details: step.detailsBuilder ? step.detailsBuilder(item) : ''
  }));
}

class MigrationSessionDetail extends Component {
  componentDidMount() {
    this.ensureLoaded();
  }

  componentDidUpdate(prevProps) {
    if (this.props.sessionId !== prevProps.sessionId) {
      this.ensureLoaded();
    }
  }

  ensureLoaded() {
    const { sessionId, detail, loading, onLoad } = this.props;

    if (sessionId && !detail && !loading) {
      onLoad(sessionId);
    }
  }

  renderLogs() {
    const { detail } = this.props;
    const logs = detail && detail.exchangeLogs ? detail.exchangeLogs : [];

    if (!logs.length) {
      return <div className="text-muted">Логи обміну відсутні.</div>;
    }

    return (
      <div style={{ marginTop: 20 }}>
        <h6 style={{ marginBottom: 12 }}>Логи обміну</h6>
        <DataGrid
          dataSource={logs}
          keyExpr="id"
          showBorders={true}
          rowAlternationEnabled={true}
          columnAutoWidth={true}
          wordWrapEnabled={true}
          height={320}
        >
          <Paging defaultPageSize={10} />
          <Pager showPageSizeSelector={true} allowedPageSizes={[10, 20, 50]} showInfo={true} />
          <Column dataField="id" caption="ID" width={80} />
          <Column dataField="operation" caption="Операція" />
          <Column dataField="requestDate" caption="Дата запиту" dataType="datetime" width={180} />
          <Column dataField="requestUri" caption="URI" minWidth={220} />
          <Column dataField="statusCode" caption="Код" width={90} />
          <Column dataField="request" caption="Request" visible={false} />
          <Column dataField="response" caption="Response" visible={false} />
          <Column dataField="editDate" caption="Дата редаг." dataType="datetime" width={180} />
        </DataGrid>
      </div>
    );
  }

  render() {
    const { detail, loading, regions, sessionId } = this.props;

    if (!sessionId) {
      return <div style={{ padding: 12 }} className="text-muted">Не вдалося визначити ідентифікатор сесії.</div>;
    }

    if (loading && !detail) {
      return <div style={{ padding: 12 }}>Завантаження деталей...</div>;
    }

    if (!detail) {
      return <div style={{ padding: 12 }} className="text-muted">Не вдалося завантажити деталі сесії.</div>;
    }

    const regionName = (regions.find((item) => item.id === detail.regionId) || {}).name || detail.regionId;
    const stepRows = buildStepRows(detail);

    return (
      <div style={{ padding: 16, backgroundColor: '#fbfcfd' }}>
        <div className="row g-3">
          <div className="col-lg-3 col-md-6">
            <div><strong>Регіон:</strong> {regionName}</div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div><strong>Статус:</strong> <StatusBadge value={detail.globalSessionStatus} /></div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div><strong>Старт:</strong> {formatDate(detail.startDate) || '-'}</div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div><strong>Завершення:</strong> {formatDate(detail.endDate) || '-'}</div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div><strong>Очікує з:</strong> {formatDate(detail.pendingFrom) || '-'}</div>
          </div>
          <div className="col-lg-9 col-md-6">
            <div><strong>Опис:</strong> {detail.migrationSessionStatusDescription || '-'}</div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <h6 style={{ marginBottom: 12 }}>Етапи міграції</h6>
          <DataGrid
            dataSource={stepRows}
            keyExpr="id"
            showBorders={true}
            rowAlternationEnabled={true}
            columnAutoWidth={true}
            wordWrapEnabled={true}
          >
            <Paging enabled={false} />
            <Column dataField="title" caption="Етап" width={150} />
            <Column
              dataField="status"
              caption="Статус"
              width={170}
              cellRender={(cell) => <StatusBadge value={cell.value} />}
            />
            <Column dataField="description" caption="Опис" minWidth={220} />
            <Column dataField="details" caption="Деталі" minWidth={220} />
            <Column dataField="startDate" caption="Старт" dataType="datetime" width={170} />
            <Column dataField="endDate" caption="Завершення" dataType="datetime" width={170} />
          </DataGrid>
        </div>

        {this.renderLogs()}
      </div>
    );
  }
}

class MigrationSessions extends Component {
  state = {
    dateFrom: Moment(new Date()).add(-3, 'days'),
    dateTo: Moment(new Date()).add(1, 'days'),
    sessions: [],
    regions: [],
    statusOptions: [],
    sessionDetails: {},
    detailLoading: {}
  };

  componentDidMount() {
    checkAccessRoute(this.props);
    this.onExecute();
  }

  getErrorMessage(error, defaultMessage) {
    if (error && error.response && error.response.data) {
      return error.response.data.message || error.response.data.err_descr || defaultMessage;
    }

    return defaultMessage;
  }

  onChangeDates = (e) => {
    this.setState({
      dateFrom: e.dateFrom,
      dateTo: e.dateTo
    });
  };

  onExecute = () => {
    this.props.onLoading(true);

    const dateFrom = Moment(this.state.dateFrom).format('YYYY-MM-DD');
    const dateTo = Moment(this.state.dateTo).format('YYYY-MM-DD');

    Promise.all([
      coreApi.get(`/MigrationSession?dateFrom=${dateFrom}&dateTo=${dateTo}`),
      coreApi.get('/region', { params: { includeDeleted: true } })
    ]).then(([sessionsResponse, regionsResponse]) => {
      const sessions = sessionsResponse.data || [];
      const statusOptions = [...new Set(sessions.map((item) => item.globalSessionStatus).filter(Boolean))]
        .map((item) => ({
          id: item,
          name: item
        }));

      this.props.onLoading(false);
      this.setState({
        sessions,
        regions: regionsResponse.data || [],
        statusOptions
      });
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося завантажити сесії обміну'), 'error');
    });
  };

  onLoadDetail = (sessionId) => {
    if (!sessionId || this.state.sessionDetails[sessionId] || this.state.detailLoading[sessionId]) {
      return;
    }

    this.setState((prevState) => ({
      detailLoading: {
        ...prevState.detailLoading,
        [sessionId]: true
      }
    }));

    coreApi.get(`/MigrationSession/${sessionId}`).then((response) => {
      this.setState((prevState) => ({
        sessionDetails: {
          ...prevState.sessionDetails,
          [sessionId]: response.data
        },
        detailLoading: {
          ...prevState.detailLoading,
          [sessionId]: false
        }
      }));
    }).catch((error) => {
      this.setState((prevState) => ({
        detailLoading: {
          ...prevState.detailLoading,
          [sessionId]: false
        }
      }));
      notify(this.getErrorMessage(error, 'Не вдалося завантажити деталі сесії'), 'error');
    });
  };

  clearFilterDataGrid = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.clearFilter();
      this.dataGrid.instance.searchByText('');
    }
  };

  onToolbarPreparing = (e) => {
    const exportBtnItem = e.toolbarOptions.items.find((item) => item.name === 'exportButton');
    const exportBtnIndex = e.toolbarOptions.items.indexOf(exportBtnItem);

    if (exportBtnIndex >= 0) {
      e.toolbarOptions.items[exportBtnIndex] = {
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
          onClick() {
            e.component.exportToExcel(false);
          }
        }
      };
    }

    e.toolbarOptions.items.unshift({
      location: 'after',
      widget: 'dxButton',
      options: {
        icon: 'notequal',
        hint: 'Очистити всі фільтри',
        onClick: this.clearFilterDataGrid
      }
    });

    e.toolbarOptions.items.unshift({
      location: 'after',
      widget: 'dxButton',
      options: {
        icon: 'refresh',
        hint: 'Оновити',
        onClick: this.onExecute
      }
    });

    e.toolbarOptions.items.unshift({
      location: 'before',
      widget: 'dxButton',
      options: {
        icon: 'download',
        text: 'Завантажити',
        hint: 'Завантажити дані',
        onClick: this.onExecute
      }
    });
  };

  renderDetail = (e) => {
    const rowData = e && e.data && e.data.data ? e.data.data : {};
    const sessionId = rowData.id ?? rowData.Id ?? null;

    return (
      <MigrationSessionDetail
        sessionId={sessionId}
        detail={sessionId ? this.state.sessionDetails[sessionId] : null}
        loading={sessionId ? !!this.state.detailLoading[sessionId] : false}
        regions={this.state.regions}
        onLoad={this.onLoadDetail}
      />
    );
  };

  render() {
    return (
      <div style={{ marginTop: '20px' }}>
        <DatFromDatTo
          defaultDateFrom={this.state.dateFrom}
          defaultDateTo={this.state.dateTo}
          onChangeDates={this.onChangeDates}
        />
        <div style={{ marginTop: '20px' }}>
          <DataGrid
            ref={(ref) => { this.dataGrid = ref; }}
            id="gridMigrationSessions"
            keyExpr="id"
            dataSource={this.state.sessions}
            allowColumnReordering={true}
            allowColumnResizing={true}
            columnAutoWidth={true}
            showBorders={true}
            rowAlternationEnabled={true}
            filterRow={{ applyFilter: true, visible: true }}
            onToolbarPreparing={this.onToolbarPreparing}
          >
            <Export enabled={true} fileName="MigrationSessions" />
            <SearchPanel visible={true} />
            <ColumnChooser enabled={true} />
            <StateStoring enabled={true} type="localStorage" storageKey="MigrationSessions" />
            <Paging defaultPageSize={50} />
            <Pager showPageSizeSelector={true} allowedPageSizes={[10, 20, 50]} showInfo={true} />

            <Column dataField="id" caption="ID" width={90} />
            <Column dataField="regionId" caption="Регіон" width={160}>
              <Lookup dataSource={this.state.regions} valueExpr="id" displayExpr="name" />
            </Column>
            <Column
              dataField="globalSessionStatus"
              caption="Загальний статус"
              width={220}
              cellRender={(cell) => <StatusBadge value={cell.value} />}
            >
              <Lookup dataSource={this.state.statusOptions} valueExpr="id" displayExpr="name" />
            </Column>
            <Column dataField="pendingFrom" caption="Очікує з" dataType="datetime" width={170} />
            <Column dataField="startDate" caption="Старт" dataType="datetime" width={170} />
            <Column dataField="endDate" caption="Завершення" dataType="datetime" width={170} />
            <Column dataField="migrationSessionStatusDescription" caption="Опис" minWidth={220} />
            <Column dataField="editDate" caption="Дата редаг." dataType="datetime" width={170} visible={false} />

            <MasterDetail enabled={true} component={this.renderDetail} />
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
)(MigrationSessions);
