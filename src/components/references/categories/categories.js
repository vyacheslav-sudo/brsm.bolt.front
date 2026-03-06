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

function normalizeCategory(item) {
  return {
    ...item,
    localizations: item.localizations || [],
    subCategories: item.subCategories || []
  };
}

function createEditModel(item, defaultSectionId = null) {
  if (!item) {
    return {
      id: null,
      localName: '',
      pimSectionId: defaultSectionId
    };
  }

  return {
    id: item.id,
    localName: item.localName || '',
    pimSectionId: item.pimSectionId || defaultSectionId
  };
}

function buildUpdateBody(model) {
  return {
    id: model.id,
    localName: String(model.localName || '').trim(),
    pimSectionId: model.pimSectionId || null
  };
}

function buildCreateBody(model) {
  return {
    localName: String(model.localName || '').trim(),
    pimSectionId: model.pimSectionId || null
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

class CategoryDetail extends React.PureComponent {
  state = {
    detail: null,
    loading: false,
    savingLocalizations: false
  };

  componentDidMount() {
    this.ensureLoaded();
  }

  componentDidUpdate(prevProps) {
    if (this.props.categoryId !== prevProps.categoryId) {
      this.setState({
        detail: null,
        loading: false,
        savingLocalizations: false
      });
      this.ensureLoaded();
    }
  }

  ensureLoaded = async () => {
    const { categoryId, onLoad } = this.props;

    if (!categoryId || this.state.loading || this.state.detail) {
      return;
    }

    this.setState({ loading: true });
    const detail = await onLoad(categoryId);

    if (this.props.categoryId !== categoryId) {
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
    const detail = await this.props.onSaveLocalizations(this.props.categoryId, localizations);
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

  renderSubcategories = (detail) => (
    <div className="detail-tab-content">
      <DataGrid
        dataSource={detail.subCategories || []}
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
    const { detail, loading, savingLocalizations } = this.state;

    if (loading || !detail) {
      return <div style={{ padding: 16 }}>Завантаження...</div>;
    }

    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <b>Деталі категорії</b>
        </div>
        <TabPanel
          deferRendering={false}
          onContentReady={this.handleContentReady}
          onSelectionChanged={this.handleContentReady}
        >
          <TabPanelItem title="Підкатегорії" render={() => this.renderSubcategories(detail)} />
          <TabPanelItem title="Локалізації" render={() => this.renderLocalizations(detail)} />
        </TabPanel>
        {savingLocalizations && (
          <div style={{ marginTop: 12, color: '#5c6f82' }}>Збереження змін...</div>
        )}
      </div>
    );
  }
}

class CategoryEditPopup extends React.PureComponent {
  state = {
    editCategory: this.props.editCategory || null
  };

  componentDidUpdate(prevProps) {
    const prevId = prevProps.editCategory ? prevProps.editCategory.id : null;
    const nextId = this.props.editCategory ? this.props.editCategory.id : null;

    if (prevId !== nextId || prevProps.visible !== this.props.visible) {
      this.setState({
        editCategory: this.props.editCategory || null
      });
    }
  }

  onFieldChanged = (e) => {
    this.setState((prevState) => ({
      editCategory: {
        ...prevState.editCategory,
        [e.dataField]: e.value
      }
    }));
  };

  renderContent = () => {
    const { sections, onClose, onSave } = this.props;
    const { editCategory } = this.state;

    if (!editCategory) {
      return <div style={{ padding: 16 }}>Завантаження...</div>;
    }

    return (
      <div style={{ padding: 12 }}>
        <Form formData={editCategory} labelLocation="top" colCount={1} onFieldDataChanged={this.onFieldChanged}>
          <GroupItem colCount={1} colSpan={1}>
            <Item dataField="localName" label={{ text: 'Назва' }} isRequired />
            <Item
              dataField="pimSectionId"
              label={{ text: 'Секції' }}
              editorType="dxSelectBox"
              editorOptions={{
                dataSource: sections,
                valueExpr: 'id',
                displayExpr: 'name',
                searchEnabled: true,
                showClearButton: true
              }}
            />
          </GroupItem>
        </Form>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
          <Button text="Зберегти" type="success" stylingMode="contained" onClick={() => onSave(this.state.editCategory)} />
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
        title="Редагування категорії"
        width={420}
        height={280}
        contentRender={this.renderContent}
      />
    );
  }
}

class CategoriesGrid extends React.PureComponent {
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
          hint: 'Додати категорію',
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
    const category = e.data?.data || e.data;

    return (
      <CategoryDetail
        categoryId={category?.id}
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
        id="gridCategories"
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
        <Export enabled fileName="PimCategories" />
        <SearchPanel visible />
        <ColumnChooser enabled />
        <StateStoring enabled type="localStorage" storageKey="PimCategories" />
        <Paging defaultPageSize={50} />
        <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50, 100]} showInfo />
        <Column dataField="id" caption="ID" width={90} />
        <Column dataField="localName" caption="Назва" />
        <Column
          dataField="pimSectionId"
          caption="Секції"
          lookup={{
            dataSource: this.props.sections,
            valueExpr: 'id',
            displayExpr: 'name'
          }}
        />
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

class Categories extends Component {
  categoryDetailsCache = {};

  loadingDetailPromises = {};

  state = {
    dataGrid: [],
    sections: [],
    editPopupVisible: false,
    editCategory: null
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
      const [categoriesResponse, sectionsResponse] = await Promise.all([
        coreApi.get('/pimcategory'),
        coreApi.get('/pimsection')
      ]);

      this.categoryDetailsCache = {};
      this.loadingDetailPromises = {};

      this.setState({
        dataGrid: (categoriesResponse.data || []).map((item) => normalizeCategory(item)),
        sections: (sectionsResponse.data || []).filter((item) => !item.deleted)
      });
    } catch (error) {
      notify(this.getErrorMessage(error, 'Не вдалося завантажити дані'), 'error');
    } finally {
      this.props.onLoading(false);
    }
  };

  loadCategoryDetail = async (categoryId) => {
    if (!categoryId) {
      return null;
    }

    if (this.categoryDetailsCache[categoryId]) {
      return this.categoryDetailsCache[categoryId];
    }

    if (this.loadingDetailPromises[categoryId]) {
      return this.loadingDetailPromises[categoryId];
    }

    const request = coreApi.get(`/pimcategory/${categoryId}`)
      .then((response) => {
        const detail = normalizeCategory(response.data);
        this.categoryDetailsCache[categoryId] = detail;
        return detail;
      })
      .catch((error) => {
        notify(this.getErrorMessage(error, 'Не вдалося завантажити деталі категорії'), 'error');
        return null;
      })
      .finally(() => {
        delete this.loadingDetailPromises[categoryId];
      });

    this.loadingDetailPromises[categoryId] = request;
    return request;
  };

  saveCategoryLocalizations = async (categoryId, localizations) => {
    this.props.onLoading(true);

    try {
      await coreApi.put('/pimcategory', {
        id: categoryId,
        localizations
      });
      delete this.categoryDetailsCache[categoryId];
      notify('Локалізації збережено', 'success', 1200);
      return await this.loadCategoryDetail(categoryId);
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
      editCategory: createEditModel(rowData, this.state.sections[0]?.id || null)
    });
  };

  closeEditPopup = () => {
    this.setState({
      editPopupVisible: false,
      editCategory: null
    });
  };

  saveCategory = async (editCategory) => {
    if (!editCategory) {
      return;
    }

    if (!String(editCategory.localName || '').trim()) {
      notify('Заповніть назву категорії', 'warning');
      return;
    }

    this.props.onLoading(true);

    try {
      if (editCategory.id) {
        await coreApi.put('/pimcategory', buildUpdateBody(editCategory));
        delete this.categoryDetailsCache[editCategory.id];
      } else {
        await coreApi.post('/pimcategory', buildCreateBody(editCategory));
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

  deleteCategory = (e) => {
    this.props.onLoading(true);

    e.cancel = coreApi.delete(`/pimcategory/${e.data.id}`)
      .then(() => {
        notify('Категорію видалено', 'success', 1200);
        delete this.categoryDetailsCache[e.data.id];
        this.props.onLoading(false);
        this.onExecute();
        return false;
      })
      .catch((error) => {
        this.props.onLoading(false);
        notify(this.getErrorMessage(error, 'Не вдалося видалити категорію'), 'error');
        return true;
      });
  };

  handleRefresh = () => {
    this.onExecute();
  };

  render() {
    return (
      <div style={{ marginTop: '20px' }}>
        <CategoryEditPopup
          visible={this.state.editPopupVisible}
          editCategory={this.state.editCategory}
          sections={this.state.sections}
          onClose={this.closeEditPopup}
          onSave={this.saveCategory}
        />
        <CategoriesGrid
          onGridRef={this.handleGridRef}
          dataGrid={this.state.dataGrid}
          sections={this.state.sections}
          onAdd={() => this.openEditPopup()}
          onRefresh={this.handleRefresh}
          onOpenEdit={this.openEditPopup}
          onDelete={this.deleteCategory}
          onLoadDetail={this.loadCategoryDetail}
          onSaveLocalizations={this.saveCategoryLocalizations}
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
)(Categories);
