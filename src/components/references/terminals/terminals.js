import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Button } from 'devextreme-react/button';
import DateBox from 'devextreme-react/date-box';
import DataGrid, {
  Button as GridButton,
  Column,
  Editing,
  Export,
  Form,
  Lookup,
  MasterDetail,
  Pager,
  Paging,
  Popup,
  SearchPanel,
  StateStoring
} from 'devextreme-react/data-grid';
import { Item as FormItem } from 'devextreme-react/form';
import { CheckBox } from 'devextreme-react/check-box';
import { SelectBox } from 'devextreme-react/select-box';
import { TabPanel, Item as TabPanelItem } from 'devextreme-react/tab-panel';
import notify from 'devextreme/ui/notify';
import fileDownload from 'js-file-download';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { checkAccessRoute } from '../../../actions/auth';
import { coreApi } from '../../../api/clientApi';

const DAY_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_TITLES = {
  Sunday: 'Неділя',
  Monday: 'Понеділок',
  Tuesday: 'Вівторок',
  Wednesday: 'Середа',
  Thursday: 'Четвер',
  Friday: "П'ятниця",
  Saturday: 'Субота'
};
const DAY_KEY_MAP = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  Sunday: 'Sunday',
  Monday: 'Monday',
  Tuesday: 'Tuesday',
  Wednesday: 'Wednesday',
  Thursday: 'Thursday',
  Friday: 'Friday',
  Saturday: 'Saturday'
};

function emptySchedule() {
  return DAY_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
}

function normalizeSchedule(schedule) {
  const result = emptySchedule();
  const sourceSchedule = schedule ? (schedule.Schedule || schedule.schedule) : null;

  if (!sourceSchedule) {
    return result;
  }

  Object.entries(sourceSchedule).forEach(([rawKey, rows]) => {
    const dayKey = DAY_KEY_MAP[rawKey];
    if (!dayKey || !Array.isArray(rows)) {
      return;
    }

    result[dayKey] = rows.map((item, index) => ({
      localId: `${dayKey}-${index}-${item.StartAtMinutesFromMidnight}-${item.StopMinutesFromMidnight}`,
      startAtMinutesFromMidnight: item.StartAtMinutesFromMidnight ?? item.startAtMinutesFromMidnight ?? 0,
      stopMinutesFromMidnight: item.StopMinutesFromMidnight ?? item.stopMinutesFromMidnight ?? 0
    }));
  });

  return result;
}

function minutesToTimeString(totalMinutes) {
  const safeMinutes = Number.isFinite(totalMinutes) ? totalMinutes : 0;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function timeStringToMinutes(value) {
  if (!value || typeof value !== 'string' || !value.includes(':')) {
    return 0;
  }

  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }

  return (hours * 60) + minutes;
}

function minutesToDate(totalMinutes) {
  const safeMinutes = Number.isFinite(totalMinutes) ? totalMinutes : 0;
  const date = new Date(2000, 0, 1, 0, 0, 0, 0);
  date.setMinutes(safeMinutes);
  return date;
}

function buildTerminalPayload(data) {
  return {
    id: data.id,
    name: data.name,
    providerId: data.providerId || null,
    address: data.address || null,
    temporaryClosed: !!data.temporaryClosed,
    temporaryClosedUntil: data.temporaryClosedUntil || null,
    regionId: data.regionId,
    deleted: !!data.deleted
  };
}

function serializeScheduleDraft(draft) {
  return JSON.stringify(
    DAY_KEYS.map((dayKey) => (
      draft[dayKey].map((item) => ({
        startAtMinutesFromMidnight: item.startAtMinutesFromMidnight,
        stopMinutesFromMidnight: item.stopMinutesFromMidnight
      }))
    ))
  );
}

const ACCENT_BUTTON_STYLE = {
  backgroundColor: '#7AB8EB',
  borderColor: '#7AB8EB',
  color: '#fff'
};

class Terminals extends Component {
  constructor(props) {
    super(props);

    this.state = {
      dataGrid: [],
      regions: [],
      scheduleDrafts: {},
      detailTabIndex: {},
      modalResetExchangeState: false,
      resetExchangeTerminal: null,
      modalCopyBindings: false,
      copyTargetTerminal: null,
      copySourceTerminalId: null,
      copyProducts: true,
      copySubCategories: true
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

  onExecute = () => {
    this.props.onLoading(true);

    Promise.allSettled([
      coreApi.get('/region'),
      coreApi.get('/terminal')
    ]).then(([regionsResult, terminalsResult]) => {
      const nextState = {};
      let hasError = false;

      if (regionsResult.status === 'fulfilled') {
        nextState.regions = regionsResult.value.data || [];
      } else {
        hasError = true;
        notify(this.getErrorMessage(regionsResult.reason, 'Не вдалося завантажити регіони'), 'error');
      }

      if (terminalsResult.status === 'fulfilled') {
        nextState.dataGrid = terminalsResult.value.data || [];
      } else {
        hasError = true;
        notify(this.getErrorMessage(terminalsResult.reason, 'Не вдалося завантажити термінали'), 'error');
      }

      this.setState(nextState);
      this.props.onLoading(false);

      if (!hasError && nextState.dataGrid) {
        this.initializeScheduleDrafts(nextState.dataGrid);
      }
    }).catch(() => {
      this.props.onLoading(false);
      notify('Не вдалося завантажити дані', 'error');
    });
  };

  initializeScheduleDrafts = (terminals) => {
    const scheduleDrafts = {};

    terminals.forEach((terminal) => {
      scheduleDrafts[terminal.id] = normalizeSchedule(terminal.workSchedule);
    });

    this.setState({ scheduleDrafts });
  };

  getDefaultRegionId() {
    const defaultRegion = this.state.regions.find((item) => item.defaultRegion && !item.deleted);
    if (defaultRegion) {
      return defaultRegion.id;
    }

    return this.state.regions.length > 0 ? this.state.regions[0].id : null;
  }

  onInitNewRow = (e) => {
    e.data.providerId = '';
    e.data.address = '';
    e.data.temporaryClosed = false;
    e.data.deleted = false;
    e.data.regionId = this.getDefaultRegionId();
  };

  onToolbarPreparing = (e) => {
    const addBtnItem = e.toolbarOptions.items.find((item) => item.name === 'addRowButton');
    const exportBtnItem = e.toolbarOptions.items.find((item) => item.name === 'exportButton');
    const addBtnIndex = e.toolbarOptions.items.indexOf(addBtnItem);
    const exportBtnIndex = e.toolbarOptions.items.indexOf(exportBtnItem);

    if (exportBtnIndex === -1) {
      return;
    }

    if (addBtnIndex >= 0) {
      e.toolbarOptions.items[addBtnIndex] = {
        ...addBtnItem,
        location: 'after',
        locateInMenu: 'auto',
        sortIndex: 10
      };
    }

    e.toolbarOptions.items[exportBtnIndex] = {
      location: 'after',
      locateInMenu: 'auto',
      sortIndex: 40,
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

    e.toolbarOptions.items.unshift({
      location: 'after',
      sortIndex: 30,
      widget: 'dxButton',
      options: {
        icon: 'notequal',
        hint: 'Оновити',
        onClick: this.clearFilterDataGrid
      }
    });

    e.toolbarOptions.items.unshift({
      location: 'after',
      sortIndex: 20,
      widget: 'dxButton',
      options: {
        icon: 'refresh',
        hint: 'Очистити всі фільтри',
        onClick: this.onExecute
      }
    });
  };

  clearFilterDataGrid = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.clearFilter();
      this.dataGrid.instance.searchByText('');
    }
  };

  prepareToolbar = (e) => {
    const addBtnItem = e.toolbarOptions.items.find((item) => item.name === 'addRowButton');
    const exportBtnItem = e.toolbarOptions.items.find((item) => item.name === 'exportButton');
    const otherItems = e.toolbarOptions.items.filter((item) => item.name !== 'addRowButton' && item.name !== 'exportButton');

    if (!exportBtnItem) {
      return;
    }

    const nextItems = [];

    if (addBtnItem) {
      nextItems.push({
        ...addBtnItem,
        location: 'after',
        locateInMenu: 'auto'
      });
    }

    nextItems.push({
      location: 'after',
      widget: 'dxButton',
      options: {
        icon: 'refresh',
        hint: 'Оновити',
        onClick: this.onExecute
      }
    });

    nextItems.push({
      location: 'after',
      widget: 'dxButton',
      options: {
        icon: 'notequal',
        hint: 'Очистити всі фільтри',
        onClick: this.clearFilterDataGrid
      }
    });

    nextItems.push({
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
    });

    e.toolbarOptions.items = [...nextItems, ...otherItems];
  };

  saveTerminal = (request) => {
    this.props.onLoading(true);

    return request.then(() => {
      this.props.onLoading(false);
      this.onExecute();
      return false;
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося зберегти дані'), 'error');
      return true;
    });
  };

  onRowUpdating = (e) => {
    const payload = buildTerminalPayload({
      ...e.oldData,
      ...e.newData
    });

    e.cancel = this.saveTerminal(coreApi.put('/terminal', payload));
  };

  onRowInserting = (e) => {
    const payload = buildTerminalPayload(e.data);
    e.cancel = this.saveTerminal(coreApi.post('/terminal', payload));
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

  onDownloadMenu = (row) => {
    this.props.onLoading(true);

    coreApi.get(`/terminal/menu/${row.id}`).then((response) => {
      this.props.onLoading(false);
      fileDownload(
        JSON.stringify(response.data, null, 2),
        `terminal-menu-${row.id}.json`,
        'application/json;charset=utf-8'
      );
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося завантажити меню'), 'error');
    });
  };

  onOpenResetExchangeStateModal = (row) => {
    this.setState({
      modalResetExchangeState: true,
      resetExchangeTerminal: row
    });
  };

  onCloseResetExchangeStateModal = () => {
    this.setState({
      modalResetExchangeState: false,
      resetExchangeTerminal: null
    });
  };

  terminalLookupExpr = (item) => {
    if (!item) {
      return '';
    }

    const name = item.name ? ` - ${item.name}` : '';
    const provider = item.providerId ? ` (${item.providerId})` : '';
    return `${item.id}${name}${provider}`;
  };

  getCopySourceTerminals = () => {
    const targetId = this.state.copyTargetTerminal ? this.state.copyTargetTerminal.id : null;
    return this.state.dataGrid.filter((item) => !item.deleted && item.id !== targetId);
  };

  onOpenCopyBindingsModal = (row) => {
    this.setState({
      modalCopyBindings: true,
      copyTargetTerminal: row,
      copySourceTerminalId: null,
      copyProducts: true,
      copySubCategories: true
    });
  };

  onCloseCopyBindingsModal = () => {
    this.setState({
      modalCopyBindings: false,
      copyTargetTerminal: null,
      copySourceTerminalId: null,
      copyProducts: true,
      copySubCategories: true
    });
  };

  getBindingCopyResult(data) {
    let result = data;

    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch (e) {
        result = {};
      }
    }

    result = result || {};

    return {
      sourceTerminalId: result.sourceTerminalId ?? result.SourceTerminalId,
      targetTerminalId: result.targetTerminalId ?? result.TargetTerminalId,
      sourceRelationsCount: result.sourceRelationsCount ?? result.SourceRelationsCount ?? 0,
      addedCount: result.addedCount ?? result.AddedCount ?? 0,
      skippedExistingCount: result.skippedExistingCount ?? result.SkippedExistingCount ?? 0,
      targetRelationsCount: result.targetRelationsCount ?? result.TargetRelationsCount ?? 0
    };
  }

  showBindingCopyResult = (title, data) => {
    const result = this.getBindingCopyResult(data);
    notify(
      `${title}: у джерелі ${result.sourceRelationsCount}, додано ${result.addedCount}, пропущено існуючих ${result.skippedExistingCount}, у цільового ${result.targetRelationsCount}`,
      'success',
      5000
    );
  };

  onConfirmCopyBindings = () => {
    const target = this.state.copyTargetTerminal;
    const sourceId = Number(this.state.copySourceTerminalId);

    if (!target) {
      return;
    }

    if (!sourceId) {
      notify('Виберіть термінал-джерело', 'warning');
      return;
    }

    if (!this.state.copyProducts && !this.state.copySubCategories) {
      notify('Виберіть, що саме копіювати', 'warning');
      return;
    }

    const requests = [];

    if (this.state.copyProducts) {
      requests.push({
        title: 'Товари',
        request: coreApi.post(`/terminal/${target.id}/BindProductsFrom/${sourceId}`)
      });
    }

    if (this.state.copySubCategories) {
      requests.push({
        title: 'Підкатегорії',
        request: coreApi.post(`/terminal/${target.id}/BindSubCategoriesFrom/${sourceId}`)
      });
    }

    this.props.onLoading(true);

    Promise.all(requests.map((item) => item.request)).then((responses) => {
      requests.forEach((item, index) => {
        this.showBindingCopyResult(item.title, responses[index].data);
      });

      this.onCloseCopyBindingsModal();
      this.onExecute();
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося скопіювати привʼязки терміналу'), 'error');
    });
  };

  getResetExchangeStateResult(data, terminalId) {
    let result = data;

    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch (e) {
        result = {};
      }
    }

    result = result || {};

    return {
      terminalId: result.terminalId ?? result.TerminalId ?? terminalId,
      productsReset: result.productsReset ?? result.ProductsReset ?? 0,
      pricesReset: result.pricesReset ?? result.PricesReset ?? 0,
      availabilitiesReset: result.availabilitiesReset ?? result.AvailabilitiesReset ?? 0,
      discountsReset: result.discountsReset ?? result.DiscountsReset ?? 0
    };
  }

  onConfirmResetExchangeState = () => {
    const terminal = this.state.resetExchangeTerminal;
    if (!terminal) {
      return;
    }

    this.setState({
      modalResetExchangeState: false,
      resetExchangeTerminal: null
    });

    this.props.onLoading(true);

    coreApi.post(`/terminal/${terminal.id}/ResetExchangeState`).then((response) => {
      const result = this.getResetExchangeStateResult(response.data, terminal.id);

      this.props.onLoading(false);
      notify(
        `Скинуто обмін для АЗК ${result.terminalId}. Товари: ${result.productsReset}, ціни: ${result.pricesReset}, доступність: ${result.availabilitiesReset}, знижки: ${result.discountsReset}`,
        'success',
        5000
      );
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося скинути стан обміну та міграцій'), 'error');
    });
  };

  ensureScheduleDraft = (terminal) => {
    const currentDraft = this.state.scheduleDrafts[terminal.id];
    if (currentDraft) {
      return currentDraft;
    }

    const nextDraft = normalizeSchedule(terminal.workSchedule);
    this.setState((prevState) => ({
      scheduleDrafts: {
        ...prevState.scheduleDrafts,
        [terminal.id]: nextDraft
      }
    }));

    return nextDraft;
  };

  updateScheduleDraft = (terminalId, updater) => {
    this.setState((prevState) => {
      const currentDraft = prevState.scheduleDrafts[terminalId] || emptySchedule();
      return {
        scheduleDrafts: {
          ...prevState.scheduleDrafts,
          [terminalId]: updater(currentDraft)
        }
      };
    });
  };

  updateGridDimensions = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      setTimeout(() => {
        this.dataGrid.instance.updateDimensions();
      }, 0);
    }
  };

  setDetailTabIndex = (terminalId, index) => {
    this.setState((prevState) => ({
      detailTabIndex: {
        ...prevState.detailTabIndex,
        [terminalId]: index
      }
    }), this.updateGridDimensions);
  };

  isScheduleDirty = (terminal) => {
    const draft = this.ensureScheduleDraft(terminal);
    return serializeScheduleDraft(draft) !== serializeScheduleDraft(normalizeSchedule(terminal.workSchedule));
  };

  addScheduleRow = (terminalId, dayKey) => {
    this.updateScheduleDraft(terminalId, (draft) => ({
      ...draft,
      [dayKey]: [
        ...draft[dayKey],
        {
          localId: `${dayKey}-${Date.now()}`,
          startAtMinutesFromMidnight: 0,
          stopMinutesFromMidnight: 0
        }
      ]
    }));
    this.updateGridDimensions();
  };

  removeScheduleRow = (terminalId, dayKey, localId) => {
    this.updateScheduleDraft(terminalId, (draft) => ({
      ...draft,
      [dayKey]: draft[dayKey].filter((item) => item.localId !== localId)
    }));
    this.updateGridDimensions();
  };

  updateScheduleRowValue = (terminalId, dayKey, localId, field, value) => {
    const minutes = timeStringToMinutes(value);

    this.updateScheduleDraft(terminalId, (draft) => ({
      ...draft,
      [dayKey]: draft[dayKey].map((item) => {
        if (item.localId !== localId) {
          return item;
        }

        return {
          ...item,
          [field]: minutes
        };
      })
    }));
    this.updateGridDimensions();
  };

  resetScheduleDraft = (terminal) => {
    this.setState((prevState) => ({
      scheduleDrafts: {
        ...prevState.scheduleDrafts,
        [terminal.id]: normalizeSchedule(terminal.workSchedule)
      }
    }));
    this.updateGridDimensions();
  };

  validateScheduleDraft(draft) {
    for (const dayKey of DAY_KEYS) {
      for (const row of draft[dayKey]) {
        if (row.startAtMinutesFromMidnight >= row.stopMinutesFromMidnight) {
          return `У дні "${DAY_TITLES[dayKey]}" час початку має бути меншим за час завершення`;
        }
      }
    }

    return null;
  }

  buildSchedulePayload(draft) {
    return {
      schedule: DAY_KEYS.reduce((acc, dayKey) => {
        acc[dayKey] = draft[dayKey].map((row) => ({
          startAtMinutesFromMidnight: row.startAtMinutesFromMidnight,
          stopMinutesFromMidnight: row.stopMinutesFromMidnight
        }));
        return acc;
      }, {})
    };
  }

  onSaveSchedule = (terminal) => {
    const draft = this.ensureScheduleDraft(terminal);
    const validationError = this.validateScheduleDraft(draft);

    if (validationError) {
      notify(validationError, 'warning');
      return;
    }

    const payload = this.buildSchedulePayload(draft);

    this.props.onLoading(true);

    coreApi.put('/terminal', {
      id: terminal.id,
      workSchedule: payload
    }).then(() => {
      const nextWorkSchedule = { Schedule: payload.schedule };

      this.setState((prevState) => ({
        dataGrid: prevState.dataGrid.map((item) => (
          item.id === terminal.id
            ? { ...item, workSchedule: nextWorkSchedule }
            : item
        )),
        scheduleDrafts: {
          ...prevState.scheduleDrafts,
          [terminal.id]: normalizeSchedule(nextWorkSchedule)
        }
      }));

      this.props.onLoading(false);
      notify('Розклад збережено', 'success');
      this.updateGridDimensions();
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося зберегти розклад'), 'error');
    });
  };

  onPushSchedule = (terminalId) => {
    const terminal = this.state.dataGrid.find((item) => item.id === terminalId);
    if (!terminal) {
      return;
    }

    if (this.isScheduleDirty(terminal)) {
      notify('Спочатку збережіть зміни розкладу', 'warning');
      return;
    }

    this.props.onLoading(true);

    coreApi.post('/terminal/UpdateSchedule', null, {
      params: { terminalId }
    }).then(() => {
      this.props.onLoading(false);
      notify('Розклад відправлено', 'success');
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося відправити розклад'), 'error');
    });
  };

  renderProductHistory = (terminal) => (
    <div className="detail-tab-content">
      <DataGrid
        dataSource={terminal.productHistory || []}
        keyExpr="id"
        allowColumnResizing={true}
        columnAutoWidth={true}
        showBorders={true}
        rowAlternationEnabled={true}
      >
        <Paging defaultPageSize={10} />
        <Pager
          showPageSizeSelector={true}
          allowedPageSizes={[10, 20, 50]}
          showInfo={true}
        />
        <Column dataField="productId" caption="Product ID" width={120} />
        <Column dataField="productName" caption="Назва товару" />
        <Column dataField="price" caption="Ціна" dataType="number" />
        <Column dataField="measure" caption="Одиниця" width={120} />
        <Column dataField="availability" caption="Доступний" dataType="boolean" width={120} />
        <Column dataField="dateFrom" caption="Діє з" dataType="datetime" />
        <Column dataField="editDate" caption="Дата редаг." dataType="datetime" />
      </DataGrid>
    </div>
  );

  renderScheduleEditor = (terminal) => {
    const draft = this.ensureScheduleDraft(terminal);
    const isDirty = this.isScheduleDirty(terminal);
    const canPush = !isDirty;

    return (
      <div className="detail-tab-content">
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="btn btn-sm me-2"
            style={ACCENT_BUTTON_STYLE}
            onClick={() => this.onSaveSchedule(terminal)}
            disabled={!isDirty}
          >
            Зберегти
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => this.resetScheduleDraft(terminal)}
            disabled={!isDirty}
          >
            Скасувати зміни
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => this.onPushSchedule(terminal.id)}
            disabled={!canPush}
          >
            Відправити розклад в Bolt
          </button>
        </div>

        {DAY_KEYS.map((dayKey) => (
          <div key={dayKey} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{DAY_TITLES[dayKey]}</strong>
              <button
                type="button"
                className="btn btn-sm"
                style={ACCENT_BUTTON_STYLE}
                onClick={() => this.addScheduleRow(terminal.id, dayKey)}
              >
                Додати інтервал
              </button>
            </div>

            {draft[dayKey].length === 0 ? (
              <div className="text-muted">Інтервали не задано</div>
            ) : (
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th style={{ width: 180 }}>Початок</th>
                    <th style={{ width: 180 }}>Кінець</th>
                    <th style={{ width: 120 }} />
                  </tr>
                </thead>
                <tbody>
                  {draft[dayKey].map((row) => (
                    <tr key={row.localId}>
                      <td>
                        <DateBox
                          type="time"
                          displayFormat="HH:mm"
                          useMaskBehavior={true}
                          stylingMode="outlined"
                          value={minutesToDate(row.startAtMinutesFromMidnight)}
                          onValueChanged={(event) => this.updateScheduleRowValue(
                            terminal.id,
                            dayKey,
                            row.localId,
                            'startAtMinutesFromMidnight',
                            minutesToTimeString((event.value || minutesToDate(0)).getHours() * 60 + (event.value || minutesToDate(0)).getMinutes())
                          )}
                        />
                      </td>
                      <td>
                        <DateBox
                          type="time"
                          displayFormat="HH:mm"
                          useMaskBehavior={true}
                          stylingMode="outlined"
                          value={minutesToDate(row.stopMinutesFromMidnight)}
                          onValueChanged={(event) => this.updateScheduleRowValue(
                            terminal.id,
                            dayKey,
                            row.localId,
                            'stopMinutesFromMidnight',
                            minutesToTimeString((event.value || minutesToDate(0)).getHours() * 60 + (event.value || minutesToDate(0)).getMinutes())
                          )}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => this.removeScheduleRow(terminal.id, dayKey, row.localId)}
                        >
                          Видалити
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    );
  };

  renderTerminalDetails = (e) => {
    const terminal = e.data.data;
    const selectedIndex = this.state.detailTabIndex[terminal.id] ?? 0;

    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <b>Додаткова інформація</b>
        </div>
        <TabPanel
          deferRendering={false}
          animationEnabled={false}
          selectedIndex={selectedIndex}
          onContentReady={this.updateGridDimensions}
          onSelectionChanged={(args) => this.setDetailTabIndex(terminal.id, args.component.option('selectedIndex'))}
        >
          <TabPanelItem title="Історія товарів" render={() => this.renderProductHistory(terminal)} />
          <TabPanelItem title="Графік роботи" render={() => this.renderScheduleEditor(terminal)} />
        </TabPanel>
      </div>
    );
  };

  render() {
    const resetExchangeTerminal = this.state.resetExchangeTerminal;
    const copyTargetTerminal = this.state.copyTargetTerminal;
    const copySourceTerminals = this.getCopySourceTerminals();

    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{ marginTop: '20px' }}>
          <DataGrid
            ref={(ref) => { this.dataGrid = ref; }}
            id="gridTerminals"
            keyExpr="id"
            dataSource={this.state.dataGrid}
            onInitNewRow={this.onInitNewRow}
            onRowUpdating={this.onRowUpdating}
            onRowInserting={this.onRowInserting}
            allowColumnReordering={true}
            allowColumnResizing={true}
            columnAutoWidth={true}
            showBorders={true}
            rowAlternationEnabled={true}
            onToolbarPreparing={this.prepareToolbar}
            filterRow={{ applyFilter: true, visible: true }}
          >
            <Export enabled={true} fileName="Terminals" />
            <SearchPanel visible={true} />
            <StateStoring enabled={true} type="localStorage" storageKey="BoltTerminals" />
            <Paging defaultPageSize={50} />
            <Pager
              showPageSizeSelector={true}
              allowedPageSizes={[10, 20, 50]}
              showInfo={true}
            />
            <Editing
              mode="popup"
              useIcons={true}
              allowUpdating={true}
              allowAdding={true}
            >
              <Popup
                title="Додавання/редагування терміналу"
                showTitle={true}
                width={520}
                height={420}
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
                <FormItem itemType="group" colCount={1} colSpan={2}>
                  <FormItem dataField="id" isRequired={true} editorOptions={{ width: 100 }} />
                  <FormItem dataField="name" isRequired={true} />
                  <FormItem dataField="providerId" />
                  <FormItem dataField="regionId" isRequired={true} />
                  <FormItem dataField="address" editorType="dxTextArea" />
                  <FormItem dataField="temporaryClosed" />
                  <FormItem dataField="temporaryClosedUntil" editorType="dxDateBox" />
                  <FormItem dataField="deleted" />
                </FormItem>
              </Form>
            </Editing>
            <Column type="buttons" width={180} fixed={true} fixedPosition="right">
              <GridButton name="edit" />
              <GridButton
                hint="Копіювати привʼязки з іншого терміналу"
                icon="copy"
                onClick={(e) => this.onOpenCopyBindingsModal(e.row.data)}
              />
              <GridButton
                hint="Завантажити меню JSON"
                icon="download"
                onClick={(e) => this.onDownloadMenu(e.row.data)}
              />
              <GridButton
                hint="Скинути стан обміну та міграцій"
                icon="revert"
                onClick={(e) => this.onOpenResetExchangeStateModal(e.row.data)}
              />
            </Column>
            <Column dataField="id" caption="АЗК ID" width={100} />
            <Column dataField="name" caption="Назва" />
            <Column dataField="providerId" caption="Provider ID" />
            <Column dataField="regionId" caption="Регіон">
              <Lookup dataSource={this.state.regions.filter((item) => !item.deleted)} valueExpr="id" displayExpr="name" />
            </Column>
            <Column dataField="address" caption="Адреса" />
            <Column dataField="temporaryClosed" caption="Тимчасово закрито" dataType="boolean" />
            <Column dataField="temporaryClosedUntil" caption="Закрито до" dataType="datetime" />
            <Column dataField="deleted" caption="Вимкнений" dataType="boolean" />
            <Column dataField="lastReceivedDate" caption="Останнє отримання" dataType="datetime" />
            <Column dataField="lastSendPacketChangeDate" caption="Остання активність" dataType="datetime" />
            <Column dataField="editDate" caption="Дата редаг." dataType="datetime" />
            <MasterDetail enabled={true} component={this.renderTerminalDetails} />
          </DataGrid>

          <Modal isOpen={this.state.modalResetExchangeState}>
            <ModalBody>
              Скинути стан обміну та міграцій для терміналу{' '}
              <b>{resetExchangeTerminal ? (resetExchangeTerminal.name || resetExchangeTerminal.id) : ''}</b>?
            </ModalBody>
            <ModalFooter>
              <Button
                text="Так"
                type="danger"
                stylingMode="contained"
                onClick={this.onConfirmResetExchangeState}
              />
              {' '}
              <Button
                text="Ні"
                type="normal"
                stylingMode="contained"
                onClick={this.onCloseResetExchangeStateModal}
              />
            </ModalFooter>
          </Modal>

          <Modal isOpen={this.state.modalCopyBindings} toggle={this.onCloseCopyBindingsModal}>
            <ModalHeader toggle={this.onCloseCopyBindingsModal}>
              Копіювання привʼязок терміналу
            </ModalHeader>
            <ModalBody>
              <div style={{ marginBottom: 12 }}>
                Цільовий термінал:{' '}
                <b>{copyTargetTerminal ? this.terminalLookupExpr(copyTargetTerminal) : ''}</b>
              </div>
              <div style={{ marginBottom: 16 }}>
                <SelectBox
                  dataSource={copySourceTerminals}
                  valueExpr="id"
                  displayExpr={this.terminalLookupExpr}
                  value={this.state.copySourceTerminalId}
                  searchEnabled={true}
                  showClearButton={true}
                  placeholder="Виберіть термінал-джерело"
                  onValueChanged={(e) => this.setState({ copySourceTerminalId: e.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <CheckBox
                  text="Товари"
                  value={this.state.copyProducts}
                  onValueChanged={(e) => this.setState({ copyProducts: e.value })}
                />
                <CheckBox
                  text="Підкатегорії"
                  value={this.state.copySubCategories}
                  onValueChanged={(e) => this.setState({ copySubCategories: e.value })}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                text="Копіювати"
                type="success"
                stylingMode="contained"
                onClick={this.onConfirmCopyBindings}
              />
              {' '}
              <Button
                text="Скасувати"
                type="normal"
                stylingMode="contained"
                onClick={this.onCloseCopyBindingsModal}
              />
            </ModalFooter>
          </Modal>
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
)(Terminals);
