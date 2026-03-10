import React, { Component } from 'react';
import { connect } from 'react-redux';
import DateBox from 'devextreme-react/date-box';
import DataGrid, {
  Column,
  Export,
  Lookup,
  Pager,
  Paging,
  SearchPanel,
  StateStoring
} from 'devextreme-react/data-grid';
import { Button } from 'devextreme-react/button';
import notify from 'devextreme/ui/notify';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { checkAccessRoute } from '../../../actions/auth';
import { coreApi } from '../../../api/clientApi';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_TITLES = {
  monday: 'Понеділок',
  tuesday: 'Вівторок',
  wednesday: 'Середа',
  thursday: 'Четвер',
  friday: "П'ятниця",
  saturday: 'Субота',
  sunday: 'Неділя'
};
const DAY_SHORT_TITLES = {
  monday: 'Пн',
  tuesday: 'Вт',
  wednesday: 'Ср',
  thursday: 'Чт',
  friday: 'Пт',
  saturday: 'Сб',
  sunday: 'Нд'
};
const DAY_COLUMNS = [
  ['monday', 'tuesday', 'wednesday', 'thursday'],
  ['friday', 'saturday', 'sunday']
];
const ACCENT_BUTTON_STYLE = {
  backgroundColor: '#7AB8EB',
  borderColor: '#7AB8EB',
  color: '#fff'
};

function minutesToTimeString(totalMinutes) {
  const safeMinutes = Number.isFinite(totalMinutes) ? totalMinutes : 0;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function minutesToDate(totalMinutes) {
  const safeMinutes = Number.isFinite(totalMinutes) ? totalMinutes : 0;
  const date = new Date(2000, 0, 1, 0, 0, 0, 0);
  date.setMinutes(safeMinutes);
  return date;
}

function emptyIntervals() {
  return DAY_KEYS.reduce((acc, dayKey) => {
    acc[dayKey] = [];
    return acc;
  }, {});
}

function parseDayIntervals(value, dayKey) {
  if (!value || typeof value !== 'string') {
    return [];
  }

  return value
    .split(';')
    .map((part, index) => {
      const [startRaw, endRaw] = part.split('-');
      const [startHour, startMinute] = (startRaw || '').split(':').map(Number);
      const [endHour, endMinute] = (endRaw || '').split(':').map(Number);

      if (
        !Number.isFinite(startHour)
        || !Number.isFinite(startMinute)
        || !Number.isFinite(endHour)
        || !Number.isFinite(endMinute)
      ) {
        return null;
      }

      return {
        localId: `${dayKey}-${index}-${startHour}-${startMinute}-${endHour}-${endMinute}`,
        startAtMinutesFromMidnight: (startHour * 60) + startMinute,
        stopMinutesFromMidnight: (endHour * 60) + endMinute
      };
    })
    .filter(Boolean);
}

function normalizeIntervals(timetable) {
  const result = emptyIntervals();

  DAY_KEYS.forEach((dayKey) => {
    result[dayKey] = parseDayIntervals(timetable ? timetable[dayKey] : null, dayKey);
  });

  return result;
}

function formatIntervalsForApi(intervals) {
  return DAY_KEYS.reduce((acc, dayKey) => {
    const value = intervals[dayKey]
      .map((item) => `${minutesToTimeString(item.startAtMinutesFromMidnight)}-${minutesToTimeString(item.stopMinutesFromMidnight)}`)
      .join(';');

    acc[dayKey] = value || null;
    return acc;
  }, {});
}

function buildTimetablePayload(data, intervals) {
  return {
    id: data.id,
    regionId: data.regionId == null ? null : data.regionId,
    name: data.name || '',
    description: data.description || '',
    ...formatIntervalsForApi(intervals)
  };
}

function renderDayIntervalsCell(cell) {
  if (!cell.value || typeof cell.value !== 'string') {
    return null;
  }

  const parts = cell.value.split(';').filter(Boolean);

  return (
    <div>
      {parts.map((part, index) => (
        <div key={`${part}-${index}`}>{part}</div>
      ))}
    </div>
  );
}

class TimetableIntervalsEditor extends React.PureComponent {
  renderIntervalsEditor(dayKey) {
    const {
      intervalsDraft,
      addInterval,
      removeInterval,
      updateInterval
    } = this.props;
    const rows = intervalsDraft[dayKey] || [];

    return (
      <div key={dayKey} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>{DAY_TITLES[dayKey]}</strong>
          <button
            type="button"
            className="btn btn-sm"
            style={ACCENT_BUTTON_STYLE}
            onClick={() => addInterval(dayKey)}
          >
            Додати інтервал
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="text-muted">Інтервали не задано</div>
        ) : (
          <table className="table table-sm table-bordered" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 170 }}>Початок</th>
                <th style={{ width: 170 }}>Кінець</th>
                <th style={{ width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.localId}>
                  <td>
                    <DateBox
                      type="time"
                      displayFormat="HH:mm"
                      useMaskBehavior={true}
                      stylingMode="outlined"
                      value={minutesToDate(row.startAtMinutesFromMidnight)}
                      onValueChanged={(event) => updateInterval(
                        dayKey,
                        row.localId,
                        'startAtMinutesFromMidnight',
                        event.value
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
                      onValueChanged={(event) => updateInterval(
                        dayKey,
                        row.localId,
                        'stopMinutesFromMidnight',
                        event.value
                      )}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeInterval(dayKey, row.localId)}
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
    );
  }

  render() {
    return (
      <div className="row">
        {DAY_COLUMNS.map((columnDays, index) => (
          <div key={index} className="col-lg-6">
            {columnDays.map((dayKey) => this.renderIntervalsEditor(dayKey))}
          </div>
        ))}
      </div>
    );
  }
}

class Timetables extends Component {
  constructor(props) {
    super(props);
    this.nameInputRef = null;
    this.descriptionInputRef = null;
    this.regionSelectRef = null;

    this.state = {
      dataGrid: [],
      regions: [],
      modalOpen: false,
      isNew: false,
      formData: {},
      intervalsDraft: emptyIntervals()
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
      coreApi.get('/region', { params: { includeDeleted: true } }),
      coreApi.get('/timetable', { params: { includeDeleted: true } })
    ]).then(([regionsResult, timetablesResult]) => {
      const nextState = {};

      if (regionsResult.status === 'fulfilled') {
        nextState.regions = regionsResult.value.data || [];
      } else {
        notify(this.getErrorMessage(regionsResult.reason, 'Не вдалося завантажити регіони'), 'error');
      }

      if (timetablesResult.status === 'fulfilled') {
        nextState.dataGrid = timetablesResult.value.data || [];
      } else {
        notify(this.getErrorMessage(timetablesResult.reason, 'Не вдалося завантажити шаблони графіків'), 'error');
      }

      this.setState(nextState);
      this.props.onLoading(false);
    }).catch(() => {
      this.props.onLoading(false);
      notify('Не вдалося завантажити дані', 'error');
    });
  };

  getDefaultRegionId() {
    const defaultRegion = this.state.regions.find((item) => item.defaultRegion && !item.deleted);
    if (defaultRegion) {
      return defaultRegion.id;
    }

    return this.state.regions.length > 0 ? this.state.regions[0].id : null;
  }

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
        hint: 'Додати шаблон графіка',
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
      location: 'after',
      widget: 'dxButton',
      options: {
        icon: 'plus',
        hint: 'Очистити всі фільтри',
        onClick: this.onAddTimetable
      }
    });
  };

  clearFilterDataGrid = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.clearFilter();
      this.dataGrid.instance.searchByText('');
    }
  };

  onAddTimetable = () => {
    this.setState({
      modalOpen: true,
      isNew: true,
      formData: {
        regionId: this.getDefaultRegionId(),
        name: '',
        description: ''
      },
      intervalsDraft: emptyIntervals()
    });
  };

  onEditTimetable = (e) => {
    this.setState({
      modalOpen: true,
      isNew: false,
      formData: { ...e.row.data },
      intervalsDraft: normalizeIntervals(e.row.data)
    });
  };

  onDeleteTimetable = (e) => {
    if (!window.confirm(`Видалити шаблон графіка "${e.row.data.name}"?`)) {
      return;
    }

    this.props.onLoading(true);

    coreApi.delete(`/timetable/${e.row.data.id}`).then(() => {
      this.props.onLoading(false);
      notify('Шаблон графіка видалено', 'success');
      this.onExecute();
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося видалити шаблон графіка'), 'error');
    });
  };

  onCloseModal = () => {
    this.nameInputRef = null;
    this.descriptionInputRef = null;
    this.regionSelectRef = null;

    this.setState({
      modalOpen: false,
      isNew: false,
      formData: {},
      intervalsDraft: emptyIntervals()
    });
  };

  updateFormField = (field, value) => {
    this.setState((prevState) => ({
      formData: {
        ...prevState.formData,
        [field]: value
      }
    }));
  };

  updateRegionField = (event) => {
    const nextValue = event.target.value;

    if (!nextValue) {
      this.updateFormField('regionId', null);
      return;
    }

    const selectedRegion = this.state.regions.find((region) => String(region.id) === nextValue);
    this.updateFormField('regionId', selectedRegion ? selectedRegion.id : nextValue);
  };

  addInterval = (dayKey) => {
    this.setState((prevState) => ({
      intervalsDraft: {
        ...prevState.intervalsDraft,
        [dayKey]: [
          ...prevState.intervalsDraft[dayKey],
          {
            localId: `${dayKey}-${Date.now()}`,
            startAtMinutesFromMidnight: 0,
            stopMinutesFromMidnight: 0
          }
        ]
      }
    }));
  };

  removeInterval = (dayKey, localId) => {
    this.setState((prevState) => ({
      intervalsDraft: {
        ...prevState.intervalsDraft,
        [dayKey]: prevState.intervalsDraft[dayKey].filter((item) => item.localId !== localId)
      }
    }));
  };

  updateInterval = (dayKey, localId, field, value) => {
    const safeDate = value instanceof Date ? value : minutesToDate(0);
    const minutes = (safeDate.getHours() * 60) + safeDate.getMinutes();

    this.setState((prevState) => ({
      intervalsDraft: {
        ...prevState.intervalsDraft,
        [dayKey]: prevState.intervalsDraft[dayKey].map((item) => {
          if (item.localId !== localId) {
            return item;
          }

          return {
            ...item,
            [field]: minutes
          };
        })
      }
    }));
  };

  validateIntervals() {
    const { intervalsDraft } = this.state;

    for (const dayKey of DAY_KEYS) {
      for (const row of intervalsDraft[dayKey]) {
        if (row.startAtMinutesFromMidnight >= row.stopMinutesFromMidnight) {
          return `У дні "${DAY_TITLES[dayKey]}" час початку має бути меншим за час завершення`;
        }
      }
    }

    return null;
  }

  onSaveTimetable = () => {
    const { isNew, intervalsDraft } = this.state;
    const selectedRegionId = this.regionSelectRef && this.regionSelectRef.value
      ? ((this.state.regions.find((region) => String(region.id) === this.regionSelectRef.value) || {}).id)
      : this.state.formData.regionId;
    const formData = {
      ...this.state.formData,
      regionId: selectedRegionId,
      name: this.nameInputRef ? this.nameInputRef.value : this.state.formData.name,
      description: this.descriptionInputRef ? this.descriptionInputRef.value : this.state.formData.description
    };

    if (!formData.name || !formData.name.trim()) {
      notify('Вкажіть назву шаблону графіка', 'warning');
      return;
    }

    if (formData.regionId == null) {
      notify('Вкажіть регіон', 'warning');
      return;
    }

    const validationError = this.validateIntervals();
    if (validationError) {
      notify(validationError, 'warning');
      return;
    }

    const payload = buildTimetablePayload(formData, intervalsDraft);
    const request = isNew
      ? coreApi.post('/timetable', payload)
      : coreApi.put('/timetable', payload);

    this.props.onLoading(true);

    request.then(() => {
      this.props.onLoading(false);
      notify('Шаблон графіка успішно збережено', 'success');
      this.onCloseModal();
      this.onExecute();
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося зберегти шаблон графіка'), 'error');
    });
  };

  render() {
    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{ marginTop: '20px' }}>
          <DataGrid
            ref={(ref) => { this.dataGrid = ref; }}
            id="gridTimetables"
            keyExpr="id"
            dataSource={this.state.dataGrid}
            allowColumnReordering={true}
            allowColumnResizing={true}
            columnAutoWidth={true}
            showBorders={true}
            rowAlternationEnabled={true}
            onToolbarPreparing={this.onToolbarPreparing}
            filterRow={{ applyFilter: true, visible: true }}
          >
            <Export enabled={true} fileName="Timetables" />
            <SearchPanel visible={true} />
            <StateStoring enabled={true} type="localStorage" storageKey="Timetables" />
            <Paging defaultPageSize={50} />
            <Pager
              showPageSizeSelector={true}
              allowedPageSizes={[10, 20, 50]}
              showInfo={true}
            />
            <Column
              type="buttons"
              width={110}
              fixed={true}
              fixedPosition="right"
              buttons={[
                {
                  hint: 'Редагувати',
                  icon: 'edit',
                  onClick: this.onEditTimetable
                },
                {
                  hint: 'Видалити',
                  icon: 'trash',
                  onClick: this.onDeleteTimetable
                }
              ]}
            />
            <Column dataField="id" caption="ID" width={80} />
            <Column dataField="name" caption="Назва" />
            <Column dataField="regionId" caption="Регіон">
              <Lookup dataSource={this.state.regions} valueExpr="id" displayExpr="name" />
            </Column>
            <Column dataField="description" caption="Опис" visible={false} />
            <Column dataField="monday" caption={DAY_SHORT_TITLES.monday} cellRender={renderDayIntervalsCell} />
            <Column dataField="tuesday" caption={DAY_SHORT_TITLES.tuesday} cellRender={renderDayIntervalsCell} />
            <Column dataField="wednesday" caption={DAY_SHORT_TITLES.wednesday} cellRender={renderDayIntervalsCell} />
            <Column dataField="thursday" caption={DAY_SHORT_TITLES.thursday} cellRender={renderDayIntervalsCell} />
            <Column dataField="friday" caption={DAY_SHORT_TITLES.friday} cellRender={renderDayIntervalsCell} />
            <Column dataField="saturday" caption={DAY_SHORT_TITLES.saturday} cellRender={renderDayIntervalsCell} />
            <Column dataField="sunday" caption={DAY_SHORT_TITLES.sunday} cellRender={renderDayIntervalsCell} />
            <Column dataField="deleted" caption="Видалений" dataType="boolean" />
            <Column dataField="lastReceivedDate" caption="Останнє отримання" dataType="datetime" />
            <Column dataField="lastSendPacketChangeDate" caption="Остання активність" dataType="datetime" />
            <Column dataField="editDate" caption="Дата редаг." dataType="datetime" />
          </DataGrid>
        </div>

        <Modal isOpen={this.state.modalOpen} size="lg">
          <ModalHeader>
            {this.state.isNew ? 'Додавання шаблону графіка' : 'Редагування шаблону графіка'}
          </ModalHeader>
          <ModalBody style={{ fontSize: 13 }}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Назва</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: 13 }}
                  defaultValue={this.state.formData.name || ''}
                  ref={(ref) => { this.nameInputRef = ref; }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Регіон</label>
                <select
                  className="form-select"
                  style={{ fontSize: 13 }}
                  value={this.state.formData.regionId == null ? '' : String(this.state.formData.regionId)}
                  onChange={this.updateRegionField}
                  ref={(ref) => { this.regionSelectRef = ref; }}
                >
                  <option value="">Оберіть регіон</option>
                  {this.state.regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Опис</label>
              <textarea
                className="form-control"
                style={{ fontSize: 13 }}
                rows="2"
                defaultValue={this.state.formData.description || ''}
                ref={(ref) => { this.descriptionInputRef = ref; }}
              />
            </div>

            <div
              style={{
                maxHeight: '50vh',
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingRight: 8
              }}
            >
              <TimetableIntervalsEditor
                intervalsDraft={this.state.intervalsDraft}
                addInterval={this.addInterval}
                removeInterval={this.removeInterval}
                updateInterval={this.updateInterval}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              text="Зберегти"
              type="success"
              stylingMode="contained"
              onClick={this.onSaveTimetable}
            />
            <Button
              text="Вийти"
              type="normal"
              stylingMode="contained"
              onClick={this.onCloseModal}
            />
          </ModalFooter>
        </Modal>
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
)(Timetables);
