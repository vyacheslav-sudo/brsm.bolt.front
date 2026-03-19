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
import notify from 'devextreme/ui/notify';
import { checkAccessRoute } from '../../../actions/auth';
import { coreApi } from '../../../api/clientApi';

const MEASURE_LABELS = {
  0: 'Штука',
  1: 'Грам',
  2: 'Мілілітр',
  3: 'Кілограм',
  4: 'Літр',
  piece: 'Штука',
  gram: 'Грам',
  mililitre: 'Мілілітр',
  kg: 'Кілограм',
  litre: 'Літр'
};

function normalizeSubcategory(item) {
  return {
    ...item,
    localizations: item.localizations || [],
    terminals: item.terminals || [],
    product: item.product || []
  };
}

function createEditModel(item, defaultCategoryId = null) {
  if (!item) {
    return {
      id: null,
      localName: '',
      categoryId: defaultCategoryId
    };
  }

  return {
    id: item.id,
    localName: item.localName || '',
    categoryId: item.categoryId || defaultCategoryId
  };
}

function buildUpdateBody(model) {
  return {
    id: model.id,
    localName: String(model.localName || '').trim(),
    categoryId: model.categoryId || null
  };
}

function buildCreateBody(model) {
  return {
    localName: String(model.localName || '').trim(),
    categoryId: model.categoryId || null
  };
}

function mapTerminalRows(terminals) {
  return (terminals || []).map((item, index) => ({
    ...item,
    __key: item.id || `${item.terminalId || 'terminal'}-${index}`
  }));
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

class SubcategoryDetail extends React.PureComponent {
  state = {
    detail: null,
    loading: false,
    savingTerminals: false,
    savingLocalizations: false
  };

  componentDidMount() {
    this.ensureLoaded();
  }

  componentDidUpdate(prevProps) {
    if (this.props.subcategoryId !== prevProps.subcategoryId) {
      this.setState({
        detail: null,
        loading: false,
        savingTerminals: false,
        savingLocalizations: false
      });
      this.ensureLoaded();
    }
  }

  ensureLoaded = async () => {
    const { subcategoryId, onLoad } = this.props;

    if (!subcategoryId || this.state.loading || this.state.detail) {
      return;
    }

    this.setState({ loading: true });

    const detail = await onLoad(subcategoryId);

    if (this.props.subcategoryId !== subcategoryId) {
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

  saveTerminalRows = async (rows) => {
    const terminals = rows.map((item) => Number(item.terminalId));

    if (terminals.some((item) => !item)) {
      notify('Оберіть АЗК для кожного рядка', 'warning');
      return true;
    }

    if (new Set(terminals).size !== terminals.length) {
      notify('Одна й та сама АЗК не може бути додана двічі', 'warning');
      return true;
    }

    this.setState({ savingTerminals: true });
    const detail = await this.props.onSaveTerminals(this.props.subcategoryId, terminals);
    this.setState((prevState) => ({
      detail: detail || prevState.detail,
      savingTerminals: false
    }));

    return !detail;
  };

  onTerminalInserting = (e) => {
    e.cancel = this.saveTerminalRows([
      ...mapTerminalRows(this.state.detail?.terminals),
      { terminalId: e.data.terminalId }
    ]);
  };

  onTerminalUpdating = (e) => {
    const rows = mapTerminalRows(this.state.detail?.terminals).map((item) => (
      item.__key === e.oldData.__key ? { ...item, ...e.newData } : item
    ));

    e.cancel = this.saveTerminalRows(rows);
  };

  onTerminalRemoving = (e) => {
    const rows = mapTerminalRows(this.state.detail?.terminals).filter((item) => item.__key !== e.data.__key);
    e.cancel = this.saveTerminalRows(rows);
  };

  saveLocalizationRows = async (rows) => {
    const localizations = rows.map((item) => ({
      id: item.id || null,
      languageCode: normalizeLanguageCode(item.languageCode),
      name: String(item.name || '').trim()
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
    const detail = await this.props.onSaveLocalizations(this.props.subcategoryId, localizations);
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

  renderTerminals = (detail) => (
    <div className="detail-tab-content">
      <DataGrid
        dataSource={mapTerminalRows(detail.terminals)}
        keyExpr="__key"
        columnAutoWidth
        showBorders
        rowAlternationEnabled
        onContentReady={this.handleContentReady}
        onRowInserting={this.onTerminalInserting}
        onRowUpdating={this.onTerminalUpdating}
        onRowRemoving={this.onTerminalRemoving}
      >
        <Paging defaultPageSize={10} />
        <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50]} showInfo />
        <Editing mode="row" useIcons allowAdding allowDeleting />
        <Column
          dataField="terminalId"
          caption="АЗК"
          validationRules={[{ type: 'required', message: 'Оберіть АЗК' }]}
          lookup={{
            dataSource: this.props.terminals,
            valueExpr: 'id',
            displayExpr: this.props.terminalLookupExpr
          }}
        />
        <Column dataField="editDate" caption="Дата редаг." dataType="datetime" allowEditing={false} />
      </DataGrid>
    </div>
  );

  renderSellingUnit = (cell) => {
    const value = cell.value;
    return MEASURE_LABELS[value] || value || '-';
  };

  renderProducts = (detail) => (
    <div className="detail-tab-content">
      <DataGrid
        dataSource={detail.product || []}
        keyExpr="id"
        columnAutoWidth
        showBorders
        rowAlternationEnabled
        onContentReady={this.handleContentReady}
      >
        <Paging defaultPageSize={10} />
        <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50]} showInfo />
        <Column dataField="id" caption="ID" width={90} />
        <Column dataField="localName" caption="Назва" />
        <Column dataField="deleted" caption="Видалений" dataType="boolean" />
        <Column dataField="orderQuantityLimit" caption="Ліміт кількості" dataType="number" />
        <Column dataField="isMeasured" caption="Мірний" dataType="boolean" />
        <Column dataField="sellingUnit" caption="Од. продажу" cellRender={this.renderSellingUnit} />
        <Column dataField="editDate" caption="Дата редаг." dataType="datetime" />
      </DataGrid>
    </div>
  );

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
        <Column dataField="editDate" caption="Дата редаг." dataType="datetime" allowEditing={false} />
      </DataGrid>
    </div>
  );

  render() {
    const { detail, loading, savingTerminals, savingLocalizations } = this.state;

    if (loading || !detail) {
      return <div style={{ padding: 16 }}>Завантаження...</div>;
    }

    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <b>Деталі підкатегорії</b>
        </div>
        <TabPanel deferRendering={false} onContentReady={this.handleContentReady} onSelectionChanged={this.handleContentReady}>
          <TabPanelItem title="Термінали" render={() => this.renderTerminals(detail)} />
          <TabPanelItem title="Продукти" render={() => this.renderProducts(detail)} />
          <TabPanelItem title="Локалізації" render={() => this.renderLocalizations(detail)} />
        </TabPanel>
        {(savingTerminals || savingLocalizations) && (
          <div style={{ marginTop: 12, color: '#5c6f82' }}>Збереження змін...</div>
        )}
      </div>
    );
  }
}

class SubcategoryEditPopup extends React.PureComponent {
  state = {
    editSubcategory: this.props.editSubcategory || null
  };

  componentDidUpdate(prevProps) {
    const prevId = prevProps.editSubcategory ? prevProps.editSubcategory.id : null;
    const nextId = this.props.editSubcategory ? this.props.editSubcategory.id : null;

    if (prevId !== nextId || prevProps.visible !== this.props.visible) {
      this.setState({
        editSubcategory: this.props.editSubcategory || null
      });
    }
  }

  onFieldChanged = (e) => {
    this.setState((prevState) => ({
      editSubcategory: {
        ...prevState.editSubcategory,
        [e.dataField]: e.value
      }
    }));
  };

  renderContent = () => {
    const { categories, onClose, onSave } = this.props;
    const { editSubcategory } = this.state;

    if (!editSubcategory) {
      return <div style={{ padding: 16 }}>Завантаження...</div>;
    }

    return (
      <div style={{ padding: 12 }}>
        <Form formData={editSubcategory} labelLocation="top" colCount={1} onFieldDataChanged={this.onFieldChanged}>
          <GroupItem colCount={1} colSpan={1}>
            <Item dataField="localName" label={{ text: 'Назва' }} isRequired />
            <Item
              dataField="categoryId"
              label={{ text: 'Категорія' }}
              isRequired
              editorType="dxSelectBox"
              editorOptions={{
                dataSource: categories,
                valueExpr: 'id',
                displayExpr: 'localName',
                searchEnabled: true
              }}
            />
          </GroupItem>
        </Form>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
          <Button text="Зберегти" type="success" stylingMode="contained" onClick={() => onSave(this.state.editSubcategory)} />
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
        title="Редагування підкатегорії"
        width={420}
        height={280}
        contentRender={this.renderContent}
      />
    );
  }
}

class SubcategoriesGrid extends React.PureComponent {
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
          hint: 'Додати підкатегорію',
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
    const subcategory = e.data?.data || e.data;

    return (
      <SubcategoryDetail
        subcategoryId={subcategory?.id}
        onLoad={this.props.onLoadDetail}
        onSaveLocalizations={this.props.onSaveLocalizations}
        onSaveTerminals={this.props.onSaveTerminals}
        terminals={this.props.terminals}
        terminalLookupExpr={this.props.terminalLookupExpr}
        onUpdateDimensions={this.refreshGridDimensions}
      />
    );
  };

  render() {
    return (
      <DataGrid
        ref={this.handleGridRef}
        id="gridSubcategories"
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
        <Export enabled fileName="PimSubCategories" />
        <SearchPanel visible />
        <ColumnChooser enabled />
        <StateStoring enabled type="localStorage" storageKey="PimSubCategories" />
        <Paging defaultPageSize={50} />
        <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50, 100]} showInfo />
        <Column dataField="id" caption="ID" width={90} />
        <Column dataField="localName" caption="Назва" />
        <Column
          dataField="categoryId"
          caption="Категорія"
          lookup={{
            dataSource: this.props.categories,
            valueExpr: 'id',
            displayExpr: 'localName'
          }}
        />
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

class Subcategories extends Component {
  subcategoryDetailsCache = {};

  loadingDetailPromises = {};

  state = {
    dataGrid: [],
    categories: [],
    terminals: [],
    editPopupVisible: false,
    editSubcategory: null
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
      const [subcategoriesResponse, categoriesResponse, terminalsResponse] = await Promise.all([
        coreApi.get('/pimsubcategory'),
        coreApi.get('/pimcategory'),
        coreApi.get('/terminal')
      ]);

      this.subcategoryDetailsCache = {};
      this.loadingDetailPromises = {};

      this.setState({
        dataGrid: (subcategoriesResponse.data || []).map((item) => normalizeSubcategory(item)),
        categories: (categoriesResponse.data || []).filter((item) => !item.deleted),
        terminals: (terminalsResponse.data || []).filter((item) => !item.deleted)
      });
    } catch (error) {
      notify(this.getErrorMessage(error, 'Не вдалося завантажити дані'), 'error');
    } finally {
      this.props.onLoading(false);
    }
  };

  loadSubcategoryDetail = async (subcategoryId) => {
    if (!subcategoryId) {
      return null;
    }

    if (this.subcategoryDetailsCache[subcategoryId]) {
      return this.subcategoryDetailsCache[subcategoryId];
    }

    if (this.loadingDetailPromises[subcategoryId]) {
      return this.loadingDetailPromises[subcategoryId];
    }

    const request = coreApi.get(`/pimsubcategory/${subcategoryId}`)
      .then((response) => {
        const detail = normalizeSubcategory(response.data);
        this.subcategoryDetailsCache[subcategoryId] = detail;
        return detail;
      })
      .catch((error) => {
        notify(this.getErrorMessage(error, 'Не вдалося завантажити деталі підкатегорії'), 'error');
        return null;
      })
      .finally(() => {
        delete this.loadingDetailPromises[subcategoryId];
      });

    this.loadingDetailPromises[subcategoryId] = request;
    return request;
  };

  saveSubcategoryTerminals = async (subcategoryId, terminals) => {
    this.props.onLoading(true);

    try {
      await coreApi.put('/pimsubcategory', {
        id: subcategoryId,
        terminals
      });
      delete this.subcategoryDetailsCache[subcategoryId];
      notify('Термінали збережено', 'success', 1200);
      return await this.loadSubcategoryDetail(subcategoryId);
    } catch (error) {
      notify(this.getErrorMessage(error, 'Не вдалося зберегти термінали'), 'error');
      return null;
    } finally {
      this.props.onLoading(false);
    }
  };

  saveSubcategoryLocalizations = async (subcategoryId, localizations) => {
    this.props.onLoading(true);

    try {
      const detail = await this.loadSubcategoryDetail(subcategoryId);
      if (!detail) {
        return null;
      }

      await coreApi.put('/pimsubcategory', {
        id: subcategoryId,
        localName: detail.localName || '',
        categoryId: detail.categoryId || null,
        localizations
      });
      delete this.subcategoryDetailsCache[subcategoryId];
      notify('Р›РѕРєР°Р»С–Р·Р°С†С–С— Р·Р±РµСЂРµР¶РµРЅРѕ', 'success', 1200);
      return await this.loadSubcategoryDetail(subcategoryId);
    } catch (error) {
      const message = this.getErrorMessage(error, 'РќРµ РІРґР°Р»РѕСЃСЏ Р·Р±РµСЂРµРіС‚Рё Р»РѕРєР°Р»С–Р·Р°С†С–С—');
      const lower = String(message || '').toLowerCase();
      if (lower.includes('localizations_language_code') || lower.includes('foreign key')) {
        notify('РќРµРІС–СЂРЅРёР№ РєРѕРґ РјРѕРІРё. Р’РёРєРѕСЂРёСЃС‚Р°Р№ С–СЃРЅСѓСЋС‡РёР№ РєРѕРґ, РЅР°РїСЂРёРєР»Р°Рґ uk-UA', 'error');
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
      editSubcategory: createEditModel(rowData, this.state.categories[0]?.id || null)
    });
  };

  closeEditPopup = () => {
    this.setState({
      editPopupVisible: false,
      editSubcategory: null
    });
  };

  saveSubcategory = async (editSubcategory) => {
    if (!editSubcategory) {
      return;
    }

    if (!String(editSubcategory.localName || '').trim()) {
      notify('Заповни назву підкатегорії', 'warning');
      return;
    }

    if (!editSubcategory.categoryId) {
      notify('Оберіть категорію', 'warning');
      return;
    }

    this.props.onLoading(true);

    try {
      if (editSubcategory.id) {
        await coreApi.put('/pimsubcategory', buildUpdateBody(editSubcategory));
        delete this.subcategoryDetailsCache[editSubcategory.id];
      } else {
        await coreApi.post('/pimsubcategory', buildCreateBody(editSubcategory));
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

  deleteSubcategory = (e) => {
    this.props.onLoading(true);

    e.cancel = coreApi.delete(`/pimsubcategory/${e.data.id}`)
      .then(() => {
        notify('Підкатегорію видалено', 'success', 1200);
        delete this.subcategoryDetailsCache[e.data.id];
        this.props.onLoading(false);
        this.onExecute();
        return false;
      })
      .catch((error) => {
        this.props.onLoading(false);
        notify(this.getErrorMessage(error, 'Не вдалося видалити підкатегорію'), 'error');
        return true;
      });
  };

  handleRefresh = () => {
    this.onExecute();
  };

  terminalLookupExpr = (item) => {
    if (!item) {
      return '';
    }

    return item.providerId ? `${item.name} (${item.providerId})` : item.name;
  };

  render() {
    return (
      <div style={{ marginTop: '20px' }}>
        <SubcategoryEditPopup
          visible={this.state.editPopupVisible}
          editSubcategory={this.state.editSubcategory}
          categories={this.state.categories}
          onClose={this.closeEditPopup}
          onSave={this.saveSubcategory}
        />
        <SubcategoriesGrid
          onGridRef={this.handleGridRef}
          dataGrid={this.state.dataGrid}
          categories={this.state.categories}
          terminals={this.state.terminals}
          onAdd={() => this.openEditPopup()}
          onRefresh={this.handleRefresh}
          onOpenEdit={this.openEditPopup}
          onDelete={this.deleteSubcategory}
          onLoadDetail={this.loadSubcategoryDetail}
          onSaveLocalizations={this.saveSubcategoryLocalizations}
          onSaveTerminals={this.saveSubcategoryTerminals}
          terminalLookupExpr={this.terminalLookupExpr}
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
)(Subcategories);
