import React, { Component } from 'react';
import { connect } from 'react-redux';
import DataGrid, {
  Column,
  ColumnChooser,
  Editing,
  Export,
  MasterDetail,
  Pager,
  Paging,
  SearchPanel,
  StateStoring
} from 'devextreme-react/data-grid';
import { Button } from 'devextreme-react/button';
import Form, { GroupItem, Item } from 'devextreme-react/form';
import Popup from 'devextreme-react/popup';
import { TabPanel, Item as TabPanelItem } from 'devextreme-react/tab-panel';
import 'devextreme/ui/color_box';
import notify from 'devextreme/ui/notify';
import { checkAccessRoute } from '../../../actions/auth';
import { coreApi } from '../../../api/clientApi';

function normalizeSection(item) {
  return {
    ...item,
    localizations: item.localizations || []
  };
}

function createEditModel(item, defaultRegionId = null) {
  if (!item) {
    return {
      id: null,
      name: '',
      regionId: defaultRegionId,
      position: 0,
      tileBgColorLight: null,
      tileBgColorDark: null
    };
  }

  return {
    id: item.id,
    name: item.name || '',
    regionId: item.regionId == null ? defaultRegionId : item.regionId,
    position: item.position ?? 0,
    tileBgColorLight: item.tileBgColorLight || null,
    tileBgColorDark: item.tileBgColorDark || null
  };
}

function buildUpdateBody(model) {
  return {
    id: model.id,
    name: String(model.name || '').trim(),
    regionId: model.regionId == null ? null : model.regionId,
    position: model.position === '' || model.position === null || model.position === undefined ? null : Number(model.position),
    tileBgColorLight: model.tileBgColorLight || null,
    tileBgColorDark: model.tileBgColorDark || null
  };
}

function buildCreateBody(model) {
  return {
    name: String(model.name || '').trim(),
    regionId: model.regionId == null ? null : model.regionId,
    position: model.position === '' || model.position === null || model.position === undefined ? 0 : Number(model.position),
    tileBgColorLight: model.tileBgColorLight || null,
    tileBgColorDark: model.tileBgColorDark || null
  };
}

function mapLocalizationRows(localizations) {
  return (localizations || []).map((item, index) => ({
    ...item,
    __key: item.id || `${item.languageCode || 'localization'}-${index}`
  }));
}

function normalizeLanguageCode(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  const lower = raw.toLowerCase();
  if (lower === 'ua-ua') {
    return 'uk-UA';
  }

  const parts = raw.split('-');
  if (parts.length !== 2) {
    return raw;
  }

  return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
}

function getReadableColorText(bgColor) {
  const value = String(bgColor || '').trim();
  const hex = value.replace('#', '');

  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) {
    return '#1f2937';
  }

  const color = hex.slice(0, 6);
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;

  return brightness >= 145 ? '#111827' : '#f9fafb';
}

class SectionDetail extends React.PureComponent {
  state = {
    detail: null,
    loading: false,
    savingLocalizations: false
  };

  componentDidMount() {
    this.ensureLoaded();
  }

  componentDidUpdate(prevProps) {
    if (this.props.sectionId !== prevProps.sectionId) {
      this.setState({
        detail: null,
        loading: false,
        savingLocalizations: false
      });
      this.ensureLoaded();
    }
  }

  ensureLoaded = async () => {
    const { sectionId, onLoad } = this.props;

    if (!sectionId || this.state.loading || this.state.detail) {
      return;
    }

    this.setState({ loading: true });
    const detail = await onLoad(sectionId);

    if (this.props.sectionId !== sectionId) {
      return;
    }

    this.setState({
      detail: detail || null,
      loading: false
    }, () => {
      if (this.props.onUpdateDimensions) {
        this.props.onUpdateDimensions();
      }
    });
  };

  saveLocalizationRows = async (rows) => {
    const localizations = rows.map((item) => ({
      id: item.id || null,
      languageCode: normalizeLanguageCode(item.languageCode),
      name: String(item.name || '').trim(),
      description: String(item.description || '').trim() || null
    }));

    if (localizations.some((item) => !item.languageCode || !item.name)) {
      notify('Заповніть мову та назву для кожного рядка', 'warning');
      return true;
    }

    if (localizations.some((item) => !/^[a-z]{2}-[A-Z]{2}$/.test(item.languageCode))) {
      notify('Код мови має бути у форматі xx-YY, наприклад uk-UA', 'warning');
      return true;
    }

    const languageCodes = localizations.map((item) => item.languageCode.toLowerCase());
    if (new Set(languageCodes).size !== languageCodes.length) {
      notify('Локалізація з однаковим кодом мови не може бути додана двічі', 'warning');
      return true;
    }

    this.setState({ savingLocalizations: true });
    const detail = await this.props.onSaveLocalizations(this.props.sectionId, localizations);
    this.setState((prevState) => ({
      detail: detail || prevState.detail,
      savingLocalizations: false
    }));

    return !detail;
  };

  onLocalizationInserting = (e) => {
    e.cancel = this.saveLocalizationRows([
      ...mapLocalizationRows(this.state.detail?.localizations),
      e.data
    ]);
  };

  onLocalizationUpdating = (e) => {
    const rows = mapLocalizationRows(this.state.detail?.localizations).map((item) => (
      item.__key === e.oldData.__key ? { ...item, ...e.newData } : item
    ));

    e.cancel = this.saveLocalizationRows(rows);
  };

  onLocalizationRemoving = (e) => {
    const rows = mapLocalizationRows(this.state.detail?.localizations).filter((item) => item.__key !== e.data.__key);
    e.cancel = this.saveLocalizationRows(rows);
  };

  handleContentReady = () => {
    if (this.props.onUpdateDimensions) {
      this.props.onUpdateDimensions();
    }
  };

  renderLocalizations = (detail) => (
    <div className="detail-tab-content">
      <DataGrid
        dataSource={mapLocalizationRows(detail.localizations)}
        keyExpr="__key"
        columnAutoWidth
        showBorders
        rowAlternationEnabled
        onContentReady={this.handleContentReady}
        onRowInserting={this.onLocalizationInserting}
        onRowUpdating={this.onLocalizationUpdating}
        onRowRemoving={this.onLocalizationRemoving}
      >
        <Paging defaultPageSize={10} />
        <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50]} showInfo />
        <Editing mode="row" useIcons allowAdding allowUpdating allowDeleting />
        <Column dataField="languageCode" caption="Код мови" validationRules={[{ type: 'required', message: 'Вкажіть код мови' }]} />
        <Column dataField="name" caption="Назва" validationRules={[{ type: 'required', message: 'Вкажіть назву' }]} />
        <Column dataField="description" caption="Опис" />
        <Column dataField="editDate" caption="Дата редаг." dataType="datetime" allowEditing={false} />
      </DataGrid>
    </div>
  );

  render() {
    const { detail, loading, savingLocalizations } = this.state;

    if (loading || !detail) {
      return <div style={{ padding: 16 }}>Завантаження...</div>;
    }

    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <b>Деталі секції</b>
        </div>
        <TabPanel
          deferRendering={false}
          onContentReady={this.handleContentReady}
          onSelectionChanged={this.handleContentReady}
        >
          <TabPanelItem title="Локалізації" render={() => this.renderLocalizations(detail)} />
        </TabPanel>
        {savingLocalizations && (
          <div style={{ marginTop: 12, color: '#5c6f82' }}>Збереження змін...</div>
        )}
      </div>
    );
  }
}

class SectionEditPopup extends React.PureComponent {
  state = {
    editSection: this.props.editSection || null
  };

  componentDidUpdate(prevProps) {
    const prevId = prevProps.editSection ? prevProps.editSection.id : null;
    const nextId = this.props.editSection ? this.props.editSection.id : null;

    if (prevId !== nextId || prevProps.visible !== this.props.visible) {
      this.setState({
        editSection: this.props.editSection || null
      });
    }
  }

  onFieldChanged = (e) => {
    this.setState((prevState) => ({
      editSection: {
        ...prevState.editSection,
        [e.dataField]: e.value
      }
    }));
  };

  renderContent = () => {
    const { regions, onClose, onSave } = this.props;
    const { editSection } = this.state;

    if (!editSection) {
      return <div style={{ padding: 16 }}>Завантаження...</div>;
    }

    return (
      <div style={{ padding: 12 }}>
        <Form formData={editSection} labelLocation="top" colCount={1} onFieldDataChanged={this.onFieldChanged}>
          <GroupItem colCount={1} colSpan={1}>
            <Item dataField="name" label={{ text: 'Назва' }} isRequired />
            <Item
              dataField="regionId"
              label={{ text: 'Регіон' }}
              editorType="dxSelectBox"
              editorOptions={{
                dataSource: regions,
                valueExpr: 'id',
                displayExpr: 'name',
                searchEnabled: true,
                showClearButton: true
              }}
            />
            <Item dataField="position" label={{ text: 'Позиція' }} editorType="dxNumberBox" editorOptions={{ min: 0, showSpinButtons: true }} />
            <Item dataField="tileBgColorLight" label={{ text: 'Колір (light)' }} editorType="dxColorBox" editorOptions={{ applyValueMode: 'instantly', showClearButton: true }} />
            <Item dataField="tileBgColorDark" label={{ text: 'Колір (dark)' }} editorType="dxColorBox" editorOptions={{ applyValueMode: 'instantly', showClearButton: true }} />
          </GroupItem>
        </Form>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
          <Button text="Зберегти" type="success" stylingMode="contained" onClick={() => onSave(this.state.editSection)} />
          <Button text="Вийти" type="normal" stylingMode="contained" onClick={onClose} />
        </div>
      </div>
    );
  };

  render() {
    return (
      <Popup
        visible={this.props.visible}
        onHiding={this.props.onClose}
        deferRendering={false}
        dragEnabled={false}
        hideOnOutsideClick={false}
        showTitle
        title="Редагування секції"
        width={460}
        height={500}
        contentRender={this.renderContent}
      />
    );
  }
}

class SectionsGrid extends React.PureComponent {
  clearFilterDataGrid = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.clearFilter();
      this.dataGrid.instance.clearSorting();
      this.dataGrid.instance.searchByText('');
    }
  };

  handleGridRef = (ref) => {
    this.dataGrid = ref;

    if (this.props.onGridRef) {
      this.props.onGridRef(ref);
    }
  };

  refreshGridDimensions = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.updateDimensions();
    }
  };

  renderColorBadge = (cell) => {
    const value = String(cell.value || '').trim();
    if (!value) {
      return <span className="text-muted">-</span>;
    }

    const textColor = getReadableColorText(value);

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 12,
          backgroundColor: value,
          color: textColor,
          //border: '1px solid rgba(0,0,0,0.15)',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.2
        }}
      >
        {value}
      </span>
    );
  };

  onToolbarPreparing = (e) => {
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
          hint: 'Додати секцію',
          onClick: this.props.onAdd
        }
      },
      {
        location: 'after',
        sortIndex: 10,
        widget: 'dxButton',
        options: {
          icon: 'refresh',
          hint: 'Оновити',
          onClick: this.props.onRefresh
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

  renderMasterDetail = (e) => {
    const section = e.data?.data || e.data;

    return (
      <SectionDetail
        sectionId={section?.id}
        onLoad={this.props.onLoadDetail}
        onSaveLocalizations={this.props.onSaveLocalizations}
        onUpdateDimensions={this.refreshGridDimensions}
      />
    );
  };

  render() {
    return (
      <DataGrid
        ref={this.handleGridRef}
        id="gridSections"
        keyExpr="id"
        dataSource={this.props.dataGrid}
        onRowRemoving={this.props.onDelete}
        allowColumnReordering
        allowColumnResizing
        columnAutoWidth
        repaintChangesOnly
        showBorders
        rowAlternationEnabled
        onToolbarPreparing={this.onToolbarPreparing}
        filterRow={{ visible: true, applyFilter: 'auto' }}
      >
        <Editing useIcons allowDeleting />
        <Export enabled fileName="PimSections" />
        <SearchPanel visible />
        <ColumnChooser enabled />
        <StateStoring enabled type="localStorage" storageKey="PimSections" />
        <Paging defaultPageSize={50} />
        <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50, 100]} showInfo />
        <Column dataField="id" caption="ID" width={90} />
        <Column dataField="name" caption="Назва" />
        <Column
          dataField="regionId"
          caption="Регіон"
          lookup={{
            dataSource: this.props.regions,
            valueExpr: 'id',
            displayExpr: 'name'
          }}
        />
        <Column dataField="position" caption="Позиція" dataType="number" />
        <Column dataField="tileBgColorLight" caption="Колір (light)" cellRender={this.renderColorBadge} />
        <Column dataField="tileBgColorDark" caption="Колір (dark)" cellRender={this.renderColorBadge} />
        <Column dataField="deleted" caption="Видалений" dataType="boolean" />
        <Column dataField="editDate" caption="Дата редаг." dataType="datetime" allowEditing={false} />
        <Column
          type="buttons"
          width={100}
          fixed
          fixedPosition="right"
          buttons={[
            {
              hint: 'Редагувати',
              icon: 'edit',
              onClick: (e) => this.props.onOpenEdit(e.row.data)
            },
            'delete'
          ]}
        />
        <MasterDetail enabled component={this.renderMasterDetail} />
      </DataGrid>
    );
  }
}

class Sections extends Component {
  sectionDetailsCache = {};

  loadingDetailPromises = {};

  state = {
    dataGrid: [],
    regions: [],
    editPopupVisible: false,
    editSection: null
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

  onExecute = async () => {
    this.props.onLoading(true);

    try {
      const [sectionsResponse, regionsResponse] = await Promise.all([
        coreApi.get('/pimsection'),
        coreApi.get('/region', { params: { includeDeleted: true } })
      ]);

      this.sectionDetailsCache = {};
      this.loadingDetailPromises = {};

      this.setState({
        dataGrid: (sectionsResponse.data || []).map((item) => normalizeSection(item)),
        regions: (regionsResponse.data || []).filter((item) => !item.deleted)
      });
    } catch (error) {
      notify(this.getErrorMessage(error, 'Не вдалося завантажити дані'), 'error');
    } finally {
      this.props.onLoading(false);
    }
  };

  loadSectionDetail = async (sectionId) => {
    if (!sectionId) {
      return null;
    }

    if (this.sectionDetailsCache[sectionId]) {
      return this.sectionDetailsCache[sectionId];
    }

    if (this.loadingDetailPromises[sectionId]) {
      return this.loadingDetailPromises[sectionId];
    }

    const request = coreApi.get(`/pimsection/${sectionId}`)
      .then((response) => {
        const detail = normalizeSection(response.data);
        this.sectionDetailsCache[sectionId] = detail;
        return detail;
      })
      .catch((error) => {
        notify(this.getErrorMessage(error, 'Не вдалося завантажити деталі секції'), 'error');
        return null;
      })
      .finally(() => {
        delete this.loadingDetailPromises[sectionId];
      });

    this.loadingDetailPromises[sectionId] = request;
    return request;
  };

  saveSectionLocalizations = async (sectionId, localizations) => {
    this.props.onLoading(true);

    try {
      const detail = await this.loadSectionDetail(sectionId);
      if (!detail) {
        return null;
      }

      await coreApi.put('/pimsection', {
        id: sectionId,
        name: detail.name,
        regionId: detail.regionId == null ? null : detail.regionId,
        position: detail.position,
        tileBgColorLight: detail.tileBgColorLight || null,
        tileBgColorDark: detail.tileBgColorDark || null,
        localizations
      });

      delete this.sectionDetailsCache[sectionId];
      notify('Локалізації збережено', 'success', 1200);
      return await this.loadSectionDetail(sectionId);
    } catch (error) {
      const message = this.getErrorMessage(error, 'Не вдалося зберегти локалізації');
      const lower = String(message || '').toLowerCase();
      if (lower.includes('localizations_language_code') || lower.includes('foreign key')) {
        notify('Невірний код мови. Використай існуючий код, наприклад uk-UA', 'error');
      } else {
        notify(message, 'error');
      }
      return null;
    } finally {
      this.props.onLoading(false);
    }
  };

  handleGridRef = (ref) => {
    this.dataGrid = ref;
  };

  closeAllMasterDetails() {
    if (!this.dataGrid || !this.dataGrid.instance) {
      return;
    }

    this.dataGrid.instance.getVisibleRows()
      .filter((row) => row && row.rowType === 'data' && row.isExpanded)
      .forEach((row) => {
        this.dataGrid.instance.collapseRow(row.key);
      });
  }

  openEditPopup = (rowData = null) => {
    this.closeAllMasterDetails();

    this.setState({
      editPopupVisible: true,
      editSection: createEditModel(rowData, this.state.regions.length > 0 ? this.state.regions[0].id : null)
    });
  };

  closeEditPopup = () => {
    this.setState({
      editPopupVisible: false,
      editSection: null
    });
  };

  saveSection = async (editSection) => {
    if (!editSection) {
      return;
    }

    if (!String(editSection.name || '').trim()) {
      notify('Заповніть назву секції', 'warning');
      return;
    }

    this.props.onLoading(true);

    try {
      if (editSection.id) {
        await coreApi.put('/pimsection', buildUpdateBody(editSection));
        delete this.sectionDetailsCache[editSection.id];
      } else {
        await coreApi.post('/pimsection', buildCreateBody(editSection));
      }

      notify('Дані збережено', 'success', 1200);
      this.closeEditPopup();
      await this.onExecute();
    } catch (error) {
      notify(this.getErrorMessage(error, 'Не вдалося зберегти дані'), 'error');
    } finally {
      this.props.onLoading(false);
    }
  };

  deleteSection = (e) => {
    this.props.onLoading(true);

    e.cancel = coreApi.delete(`/pimsection/${e.data.id}`)
      .then(() => {
        notify('Секцію видалено', 'success', 1200);
        delete this.sectionDetailsCache[e.data.id];
        this.props.onLoading(false);
        this.onExecute();
        return false;
      })
      .catch((error) => {
        this.props.onLoading(false);
        notify(this.getErrorMessage(error, 'Не вдалося видалити секцію'), 'error');
        return true;
      });
  };

  handleRefresh = () => {
    this.onExecute();
  };

  render() {
    return (
      <div style={{ marginTop: '20px' }}>
        <SectionEditPopup
          visible={this.state.editPopupVisible}
          editSection={this.state.editSection}
          regions={this.state.regions}
          onClose={this.closeEditPopup}
          onSave={this.saveSection}
        />
        <SectionsGrid
          onGridRef={this.handleGridRef}
          dataGrid={this.state.dataGrid}
          regions={this.state.regions}
          onAdd={() => this.openEditPopup()}
          onRefresh={this.handleRefresh}
          onOpenEdit={this.openEditPopup}
          onDelete={this.deleteSection}
          onLoadDetail={this.loadSectionDetail}
          onSaveLocalizations={this.saveSectionLocalizations}
        />
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
)(Sections);
