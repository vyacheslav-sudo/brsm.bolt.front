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
import 'devextreme/ui/tag_box';
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

const SECTION_TITLE_STYLE = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 12
};

function parseTags(tags) {
  const values = String(tags || '')
    .split(';')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return {
    alcohol: values.includes('alco'),
    tobacco: values.includes('tobacco')
  };
}

function normalizeProduct(item) {
  const tagFlags = parseTags(item.tags);

  return {
    ...item,
    alcohol: item.alcohol !== undefined ? item.alcohol : tagFlags.alcohol,
    tobacco: item.tobacco !== undefined ? item.tobacco : tagFlags.tobacco,
    isMeasured: Boolean(item.isMeasured),
    deleted: Boolean(item.deleted),
    isValid: item.isValid,
    validationDescriptionList: item.validationDescriptionList || [],
    barcodes: item.barcodes || [],
    subCategories: item.subCategories || [],
    terminals: item.terminals || [],
    priceHistory: item.priceHistory || []
  };
}

function createEditModel(detail) {
  const normalized = normalizeProduct(detail);

  return {
    id: normalized.id,
    localName: normalized.localName || '',
    localDescription: normalized.localDescription || '',
    imageLinkId: normalized.imageLinkId || null,
    vatTag: normalized.vatTag || '',
    deleted: Boolean(normalized.deleted),
    alcohol: Boolean(normalized.alcohol),
    tobacco: Boolean(normalized.tobacco),
    isMeasured: Boolean(normalized.isMeasured),
    productMainMeasure: normalized.productMainMeasure || null,
    productMeasureValue: normalized.productMeasureValue ?? null,
    sellingUnit: normalized.sellingUnit || 'piece',
    orderQuantityLimit: normalized.orderQuantityLimit ?? null,
    weightGrossGram: normalized.weightGrossGram ?? null,
    subCategoryIds: (normalized.subCategories || []).map((item) => item.subCategoryId)
  };
}

function buildUpdateBody(model) {
  return {
    id: model.id,
    localName: model.localName,
    localDescription: model.localDescription,
    imageLinkId: model.imageLinkId || null,
    vatTag: model.vatTag || null,
    deleted: Boolean(model.deleted),
    alcohol: Boolean(model.alcohol),
    tobacco: Boolean(model.tobacco),
    isMeasured: Boolean(model.isMeasured),
    productMainMeasure: model.productMainMeasure || null,
    productMeasureValue: model.productMeasureValue === '' ? null : model.productMeasureValue,
    sellingUnit: model.sellingUnit || null,
    orderQuantityLimit: model.orderQuantityLimit === '' ? null : model.orderQuantityLimit,
    weightGrossGram: model.weightGrossGram === '' ? null : model.weightGrossGram,
    subCategories: model.subCategoryIds || []
  };
}

function mapBarcodeRows(barcodes) {
  return (barcodes || []).map((item, index) => ({
    ...item,
    __key: `${item.barcode || 'barcode'}-${index}`
  }));
}

function mapTerminalRows(terminals) {
  return (terminals || []).map((item, index) => ({
    ...item,
    __key: item.id || `${item.terminalId || 'terminal'}-${index}`
  }));
}

function ValidationBadge({ value }) {
  if (value === true) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 12,
          backgroundColor: '#d7f2df',
          color: '#1d6b34',
          fontSize: 12,
          fontWeight: 600
        }}
      >
        Валідний
      </span>
    );
  }

  if (value === false) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 12,
          backgroundColor: '#f8d7da',
          color: '#842029',
          fontSize: 12,
          fontWeight: 600
        }}
      >
        Є помилки
      </span>
    );
  }

  return <span className="text-muted">-</span>;
}

class ProductDetail extends React.PureComponent {
  state = {
    detail: null,
    loading: false,
    savingBarcodes: false,
    savingTerminals: false
  };

  componentDidMount() {
    this.ensureLoaded();
  }

  componentDidUpdate(prevProps) {
    if (this.props.productId !== prevProps.productId) {
      this.setState({
        detail: null,
        loading: false,
        savingBarcodes: false,
        savingTerminals: false
      });
      this.ensureLoaded();
    }
  }

  ensureLoaded = async () => {
    const { productId, onLoad } = this.props;

    if (!productId || this.state.loading || this.state.detail) {
      return;
    }

    this.setState({ loading: true });

    const detail = await onLoad(productId);

    if (this.props.productId !== productId) {
      return;
    }

    this.setState({
      detail: detail || null,
      loading: false
    });
  };

  saveBarcodeRows = async (rows) => {
    const barcodes = rows
      .map((item) => String(item.barcode || '').trim())
      .filter(Boolean);

    if (rows.some((item) => !String(item.barcode || '').trim())) {
      notify('Штрихкод не може бути порожнім', 'warning');
      return true;
    }

    if (barcodes.length === 0 && (this.state.detail?.barcodes || []).length > 0) {
      notify('Бек поки не підтримує повне очищення всіх штрихкодів одним запитом', 'warning');
      return true;
    }

    this.setState({ savingBarcodes: true });
    const detail = await this.props.onSaveBarcodes(this.props.productId, barcodes);
    this.setState((prevState) => ({
      detail: detail || prevState.detail,
      savingBarcodes: false
    }));

    return !detail;
  };

  saveTerminalRows = async (rows) => {
    const terminals = rows.map((item) => ({
      terminalId: Number(item.terminalId),
      timetableId: item.timetableId || null
    }));

    if (terminals.some((item) => !item.terminalId)) {
      notify('Оберіть АЗК для кожного рядка', 'warning');
      return true;
    }

    const duplicateIds = terminals.map((item) => item.terminalId);
    if (new Set(duplicateIds).size !== duplicateIds.length) {
      notify('Одна й та сама АЗК не може бути додана двічі', 'warning');
      return true;
    }

    this.setState({ savingTerminals: true });
    const detail = await this.props.onSaveTerminals(this.props.productId, terminals);
    this.setState((prevState) => ({
      detail: detail || prevState.detail,
      savingTerminals: false
    }));

    return !detail;
  };

  onBarcodeInserting = (e) => {
    e.cancel = this.saveBarcodeRows([...mapBarcodeRows(this.state.detail?.barcodes), { barcode: e.data.barcode }]);
  };

  onBarcodeUpdating = (e) => {
    const rows = mapBarcodeRows(this.state.detail?.barcodes).map((item) => (
      item.__key === e.oldData.__key ? { ...item, ...e.newData } : item
    ));

    e.cancel = this.saveBarcodeRows(rows);
  };

  onBarcodeRemoving = (e) => {
    const rows = mapBarcodeRows(this.state.detail?.barcodes).filter((item) => item.__key !== e.data.__key);
    e.cancel = this.saveBarcodeRows(rows);
  };

  onTerminalInserting = (e) => {
    e.cancel = this.saveTerminalRows([...mapTerminalRows(this.state.detail?.terminals), {
      terminalId: e.data.terminalId,
      timetableId: e.data.timetableId || null
    }]);
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

  onTerminalEditorPreparing = (e) => {
    if (e.parentType !== 'dataRow' || e.dataField !== 'terminalId') {
      return;
    }

    if (!e.row || e.row.isNewRow) {
      return;
    }

    e.editorOptions.disabled = true;
  };

  renderValidation(detail) {
    const messages = detail.validationDescriptionList || [];

    return (
      <div className="detail-tab-content">
        <div style={{ marginBottom: 12 }}>
          <b>Стан валідації</b>
        </div>
        <div style={{ marginBottom: 12 }}>
          <ValidationBadge value={detail.isValid} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <b>Остання перевірка:</b> {detail.lastValidation || '-'}
        </div>
        {messages.length > 0 ? (
          <ul style={{ marginBottom: 0 }}>
            {messages.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <span className="text-muted">Опис помилок відсутній.</span>
        )}
      </div>
    );
  }

  render() {
    const { detail, loading, savingBarcodes, savingTerminals } = this.state;
    const { terminals, timetables, terminalLookupExpr, timetableLookupExpr } = this.props;

    if (loading || !detail) {
      return <div style={{ padding: 16 }}>Завантаження...</div>;
    }

    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <b>Деталі продукту</b>
        </div>
        <TabPanel deferRendering={false}>
          <TabPanelItem
            title="Штрихкоди"
            render={() => (
              <div className="detail-tab-content">
                <DataGrid
                  dataSource={mapBarcodeRows(detail.barcodes)}
                  keyExpr="__key"
                  columnAutoWidth
                  showBorders
                  rowAlternationEnabled
                  onRowInserting={this.onBarcodeInserting}
                  onRowUpdating={this.onBarcodeUpdating}
                  onRowRemoving={this.onBarcodeRemoving}
                >
                  <Paging defaultPageSize={10} />
                  <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50]} showInfo />
                  <Editing mode="row" useIcons allowAdding allowDeleting />
                  <Column dataField="barcode" caption="Штрихкод" />
                  <Column dataField="editDate" caption="Дата редаг." dataType="datetime" allowEditing={false} />
                </DataGrid>
              </div>
            )}
          />
          <TabPanelItem
            title="Підкатегорії"
            render={() => (
              <div className="detail-tab-content">
                <DataGrid dataSource={detail.subCategories || []} keyExpr="id" columnAutoWidth showBorders rowAlternationEnabled>
                  <Paging defaultPageSize={10} />
                  <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50]} showInfo />
                  <Column dataField="subCategoryId" caption="ID" width={90} />
                  <Column dataField="subCategoryName" caption="Назва" />
                  <Column dataField="editDate" caption="Дата редаг." dataType="datetime" />
                </DataGrid>
              </div>
            )}
          />
          <TabPanelItem
            title="Термінали"
            render={() => (
              <div className="detail-tab-content">
                <DataGrid
                  dataSource={mapTerminalRows(detail.terminals)}
                  keyExpr="__key"
                  columnAutoWidth
                  showBorders
                  rowAlternationEnabled
                  onEditorPreparing={this.onTerminalEditorPreparing}
                  onRowInserting={this.onTerminalInserting}
                  onRowUpdating={this.onTerminalUpdating}
                  onRowRemoving={this.onTerminalRemoving}
                >
                  <Paging defaultPageSize={10} />
                  <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50]} showInfo />
                  <Editing mode="row" useIcons allowAdding allowUpdating allowDeleting />
                  <Column
                    dataField="terminalId"
                    caption="АЗК"
                    validationRules={[{ type: 'required', message: 'Оберіть АЗК' }]}
                    lookup={{
                      dataSource: terminals,
                      valueExpr: 'id',
                      displayExpr: terminalLookupExpr
                    }}
                  />
                  <Column
                    dataField="timetableId"
                    caption="Розклад"
                    lookup={{
                      dataSource: timetables,
                      valueExpr: 'id',
                      displayExpr: timetableLookupExpr
                    }}
                  />
                  <Column dataField="editDate" caption="Дата редаг." dataType="datetime" allowEditing={false} />
                  <Column type="buttons" width={100} fixed fixedPosition="right" buttons={['edit', 'delete']} />
                </DataGrid>
              </div>
            )}
          />
          <TabPanelItem
            title="Історія цін"
            render={() => (
              <div className="detail-tab-content">
                <DataGrid dataSource={detail.priceHistory || []} keyExpr="id" columnAutoWidth showBorders rowAlternationEnabled>
                  <Paging defaultPageSize={10} />
                  <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50]} showInfo />
                  <Column dataField="terminalId" caption="ID АЗК" width={90} />
                  <Column dataField="terminalName" caption="АЗК" />
                  <Column dataField="dateFrom" caption="Дата з" dataType="datetime" />
                  <Column dataField="price" caption="Ціна" dataType="number" format="# ,##0.00" />
                  <Column dataField="measure" caption="Одиниця" />
                  <Column dataField="availability" caption="Доступність" dataType="boolean" />
                  <Column dataField="editDate" caption="Дата редаг." dataType="datetime" />
                </DataGrid>
              </div>
            )}
          />
          <TabPanelItem title="Валідація" render={() => this.renderValidation(detail)} />
        </TabPanel>
        {(savingBarcodes || savingTerminals) && (
          <div style={{ marginTop: 12, color: '#5c6f82' }}>Збереження змін...</div>
        )}
      </div>
    );
  }
}

class ProductEditPopup extends React.PureComponent {
  constructor(props) {
    super(props);
    this.popupScrollContainer = React.createRef();
    this.state = {
      editProduct: props.editProduct || null
    };
  }

  componentDidUpdate(prevProps) {
    const prevId = prevProps.editProduct ? prevProps.editProduct.id : null;
    const nextId = this.props.editProduct ? this.props.editProduct.id : null;

    if (prevId !== nextId || prevProps.visible !== this.props.visible) {
      this.setState({
        editProduct: this.props.editProduct || null
      });
    }
  }

  onEditFieldChanged = (e) => {
    this.setState((prevState) => ({
      editProduct: {
        ...prevState.editProduct,
        [e.dataField]: e.value
      }
    }));
  };

  onPopupContentWheel = (event) => {
    const container = this.popupScrollContainer.current;

    if (!container) {
      return;
    }

    container.scrollTop += event.deltaY;
    event.preventDefault();
  };

  renderImagePreview() {
    const { imagePreviewSrc } = this.props;
    const { editProduct } = this.state;
    const imageUrl = imagePreviewSrc(editProduct?.imageLinkId);

    if (!imageUrl) {
      return <span className="text-muted">Зображення не вибрано</span>;
    }

    return (
      <img
        src={imageUrl}
        alt=""
        style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8, border: '1px solid #d8e3ef' }}
      />
    );
  }

  renderContent = () => {
    const {
      images,
      subcategories,
      imageLookupExpr,
      subcategoryLookupExpr,
      measureLookupExpr,
      onClose,
      onSave
    } = this.props;
    const { editProduct } = this.state;

    if (!editProduct) {
      return <div style={{ padding: 16 }}>Завантаження...</div>;
    }

    return (
      <div style={{ padding: 8, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          ref={this.popupScrollContainer}
          onWheel={this.onPopupContentWheel}
          style={{ flex: '1 1 auto', overflowY: 'auto', overflowX: 'hidden', paddingRight: 8 }}
        >
          <div style={SECTION_TITLE_STYLE}>Загальні дані</div>
          <Form formData={editProduct} labelLocation="top" colCount={2} onFieldDataChanged={this.onEditFieldChanged}>
            <GroupItem colCount={2} colSpan={2}>
              <Item dataField="localName" label={{ text: 'Назва' }} isRequired />
              <Item
                dataField="imageLinkId"
                label={{ text: 'Зображення' }}
                editorType="dxSelectBox"
                editorOptions={{
                  dataSource: images,
                  valueExpr: 'id',
                  displayExpr: imageLookupExpr,
                  searchEnabled: true
                }}
              />
              <Item
                dataField="localDescription"
                colSpan={2}
                label={{ text: 'Опис' }}
                editorType="dxTextArea"
                editorOptions={{ minHeight: 60 }}
              />
            </GroupItem>
          </Form>

          <div style={{ ...SECTION_TITLE_STYLE, marginTop: 18 }}>Основні параметри</div>
          <Form formData={editProduct} labelLocation="top" colCount={2} onFieldDataChanged={this.onEditFieldChanged}>
            <GroupItem colCount={2} colSpan={2}>
              <Item dataField="vatTag" label={{ text: 'VAT tag' }} />
              <Item dataField="orderQuantityLimit" label={{ text: 'Ліміт кількості' }} editorType="dxNumberBox" editorOptions={{ min: 0 }} />
              <Item dataField="weightGrossGram" label={{ text: 'Вага брутто, г' }} editorType="dxNumberBox" editorOptions={{ min: 0 }} />
              <Item dataField="deleted" label={{ text: 'Видалений' }} editorType="dxCheckBox" />
              <Item dataField="isMeasured" label={{ text: 'Мірний товар' }} editorType="dxCheckBox" />
              <Item itemType="empty" />
              <Item
                dataField="productMainMeasure"
                label={{ text: 'Основна одиниця' }}
                editorType="dxSelectBox"
                editorOptions={{
                  dataSource: MEASURE_OPTIONS,
                  valueExpr: 'id',
                  displayExpr: measureLookupExpr,
                  showClearButton: true
                }}
              />
              <Item dataField="productMeasureValue" label={{ text: 'Значення одиниці' }} editorType="dxNumberBox" editorOptions={{ min: 0, showSpinButtons: true }} />
              <Item
                dataField="sellingUnit"
                label={{ text: 'Одиниця продажу' }}
                editorType="dxSelectBox"
                editorOptions={{
                  dataSource: MEASURE_OPTIONS,
                  valueExpr: 'id',
                  displayExpr: measureLookupExpr
                }}
              />
              <Item itemType="empty" />
              <Item dataField="alcohol" label={{ text: 'Алкоголь' }} editorType="dxCheckBox" />
              <Item dataField="tobacco" label={{ text: 'Тютюн' }} editorType="dxCheckBox" />
            </GroupItem>
          </Form>

          <div style={{ ...SECTION_TITLE_STYLE, marginTop: 18 }}>Структура</div>
          <Form formData={editProduct} labelLocation="top" colCount={2} onFieldDataChanged={this.onEditFieldChanged}>
            <GroupItem colCount={1} colSpan={1}>
              <Item
                dataField="subCategoryIds"
                label={{ text: 'Підкатегорії' }}
                editorType="dxTagBox"
                editorOptions={{
                  dataSource: subcategories,
                  valueExpr: 'id',
                  displayExpr: subcategoryLookupExpr,
                  searchEnabled: true,
                  showSelectionControls: true,
                  multiline: true
                }}
              />
            </GroupItem>
          </Form>

          <div style={{ ...SECTION_TITLE_STYLE, marginTop: 18 }}>Зображення</div>
          <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {this.renderImagePreview()}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20, flex: '0 0 auto' }}>
          <Button text="Зберегти" type="success" stylingMode="contained" onClick={() => onSave(this.state.editProduct)} />
          <Button text="Вийти" type="normal" stylingMode="contained" onClick={onClose} />
        </div>
      </div>
    );
  };

  render() {
    const { visible, onClose } = this.props;

    return (
      <Popup
        visible={visible}
        onHiding={onClose}
        deferRendering={false}
        dragEnabled={false}
        hideOnOutsideClick={false}
        showTitle
        title="Редагування продукту"
        width={920}
        height={760}
        contentRender={this.renderContent}
      />
    );
  }
}

class ProductsGrid extends React.PureComponent {
  clearFilterDataGrid = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.clearFilter();
      this.dataGrid.instance.clearSorting();
      this.dataGrid.instance.searchByText('');
    }
  };

  refreshGridDimensions = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.updateDimensions();
    }
  };

  handleGridRef = (ref) => {
    this.dataGrid = ref;

    if (this.props.onGridRef) {
      this.props.onGridRef(ref);
    }
  };

  imagePreviewSrc = (imageLinkId) => {
    const image = this.props.images.find((item) => item.id === imageLinkId);
    return image ? image.imageUrl : null;
  };

  imageRender = (cell) => {
    const imageUrl = cell.data.imageUrl || this.imagePreviewSrc(cell.data.imageLinkId);

    if (!imageUrl) {
      return <span className="text-muted">-</span>;
    }

    return <img src={imageUrl} alt="" width="50" onLoad={this.refreshGridDimensions} onError={this.refreshGridDimensions} />;
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
    const product = e.data?.data || e.data;

    return (
      <ProductDetail
        productId={product?.id}
        onLoad={this.props.onLoadDetail}
        onSaveBarcodes={this.props.onSaveBarcodes}
        onSaveTerminals={this.props.onSaveTerminals}
        terminals={this.props.terminals}
        timetables={this.props.timetables}
        terminalLookupExpr={this.props.terminalLookupExpr}
        timetableLookupExpr={this.props.timetableLookupExpr}
        measureLookupExpr={this.props.measureLookupExpr}
      />
    );
  };

  render() {
    return (
      <DataGrid
        ref={this.handleGridRef}
        id="gridProducts"
        keyExpr="id"
        dataSource={this.props.dataGrid}
        allowColumnReordering
        allowColumnResizing
        columnAutoWidth
        repaintChangesOnly
        showBorders
        rowAlternationEnabled
        onToolbarPreparing={this.onToolbarPreparing}
        filterRow={{ visible: true, applyFilter: 'auto' }}
      >
        <Editing useIcons allowUpdating />
        <Export enabled fileName="Products" />
        <SearchPanel visible />
        <ColumnChooser enabled />
        <StateStoring enabled type="localStorage" storageKey="PimProducts" />
        <Paging defaultPageSize={50} />
        <Pager showPageSizeSelector allowedPageSizes={[10, 20, 50, 100]} showInfo />
        <Column dataField="id" caption="ID" width={90} />
        <Column dataField="localName" caption="Назва" />
        <Column dataField="localDescription" caption="Опис" visible={false} />
        <Column caption="Зображення" alignment="center" width={120} cellRender={this.imageRender} allowFiltering={false} />
        <Column dataField="alcohol" caption="Алкоголь" dataType="boolean" />
        <Column dataField="tobacco" caption="Тютюн" dataType="boolean" />
        <Column dataField="isMeasured" caption="Мірний" dataType="boolean" />
        <Column
          dataField="productMainMeasure"
          caption="Осн. од. виміру"
          lookup={{
            dataSource: MEASURE_OPTIONS,
            valueExpr: 'id',
            displayExpr: 'name'
          }}
        />
        <Column dataField="productMeasureValue" caption="Значення" dataType="number" />
        <Column
          dataField="sellingUnit"
          caption="Од. продажу"
          lookup={{
            dataSource: MEASURE_OPTIONS,
            valueExpr: 'id',
            displayExpr: 'name'
          }}
        />
        <Column dataField="orderQuantityLimit" caption="Ліміт кількості" dataType="number" />
        <Column dataField="weightGrossGram" caption="Вага брутто, г" dataType="number" />
        <Column dataField="deleted" caption="Видалений" dataType="boolean" />
        <Column dataField="lastValidation" caption="Остання валідація" dataType="datetime" />
        <Column dataField="isValid" caption="Валідація" cellRender={(cell) => <ValidationBadge value={cell.value} />} />
        <Column dataField="editDate" caption="Дата редаг." dataType="datetime" />
        <Column
          type="buttons"
          width={70}
          fixed
          fixedPosition="right"
          buttons={[
            {
              hint: 'Редагувати',
              icon: 'edit',
              onClick: (e) => this.props.onOpenEdit(e.row.data)
            }
          ]}
        />
        <MasterDetail enabled component={this.renderMasterDetail} />
      </DataGrid>
    );
  }
}

class Products extends Component {
  productDetailsCache = {};

  loadingDetailPromises = {};

  state = {
    dataGrid: [],
    images: [],
    subcategories: [],
    terminals: [],
    timetables: [],
    editPopupVisible: false,
    editProduct: null
  };

  componentDidMount() {
    checkAccessRoute(this.props);
    this.onExecute();
  }

  onExecute = async () => {
    this.props.onLoading(true);

    try {
      const [productsResponse, imagesResponse, subcategoriesResponse, terminalsResponse, timetablesResponse] = await Promise.all([
        coreApi.get('/pimproduct'),
        coreApi.get('/image'),
        coreApi.get('/pimsubcategory'),
        coreApi.get('/terminal'),
        coreApi.get('/timetable')
      ]);

      this.productDetailsCache = {};
      this.loadingDetailPromises = {};

      this.setState({
        dataGrid: (productsResponse.data || []).map((item) => normalizeProduct(item)),
        images: imagesResponse.data || [],
        subcategories: (subcategoriesResponse.data || []).filter((item) => !item.deleted),
        terminals: (terminalsResponse.data || []).filter((item) => !item.deleted),
        timetables: (timetablesResponse.data || []).filter((item) => !item.deleted)
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
  };

  loadProductDetail = async (productId) => {
    if (!productId) {
      return null;
    }

    if (this.productDetailsCache[productId]) {
      return this.productDetailsCache[productId];
    }

    if (this.loadingDetailPromises[productId]) {
      return this.loadingDetailPromises[productId];
    }

    const request = coreApi.get(`/pimproduct/${productId}`)
      .then((response) => {
        const detail = normalizeProduct(response.data);
        this.productDetailsCache[productId] = detail;
        return detail;
      })
      .catch((error) => {
        if (error.response && error.response.data && error.response.data.message) {
          notify(error.response.data.message, 'error');
        } else {
          notify('Не вдалося завантажити деталі продукту', 'error');
        }

        return null;
      })
      .finally(() => {
        delete this.loadingDetailPromises[productId];
      });

    this.loadingDetailPromises[productId] = request;
    return request;
  };

  saveProductBarcodes = async (productId, barcodes) => {
    this.props.onLoading(true);

    try {
      await coreApi.put('/pimproduct', {
        id: productId,
        barcodes
      });
      delete this.productDetailsCache[productId];
      notify('Штрихкоди збережено', 'success', 1200);
      return await this.loadProductDetail(productId);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        notify(error.response.data.message, 'error');
      } else {
        notify('Не вдалося зберегти штрихкоди', 'error');
      }

      return null;
    } finally {
      this.props.onLoading(false);
    }
  };

  saveProductTerminals = async (productId, terminals) => {
    this.props.onLoading(true);

    try {
      await coreApi.put('/pimproduct', {
        id: productId,
        terminals: terminals.map((item) => ({
          terminalId: Number(item.terminalId),
          productId,
          timetableId: item.timetableId || null
        }))
      });
      delete this.productDetailsCache[productId];
      notify('Термінали збережено', 'success', 1200);
      return await this.loadProductDetail(productId);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        notify(error.response.data.message, 'error');
      } else {
        notify('Не вдалося зберегти термінали', 'error');
      }

      return null;
    } finally {
      this.props.onLoading(false);
    }
  };

  imagePreviewSrc = (imageLinkId) => {
    const image = this.state.images.find((item) => item.id === imageLinkId);
    return image ? image.imageUrl : null;
  };

  imageLookupExpr = (item) => {
    if (!item) {
      return '';
    }

    const suffix = item.width && item.height ? ` / ${item.width}x${item.height}px` : '';
    return `${item.description}${suffix} / ${item.originalFileName}`;
  };

  subcategoryLookupExpr = (item) => (item ? item.localName : '');

  measureLookupExpr = (item) => (item ? item.name : '');

  terminalLookupExpr = (item) => {
    if (!item) {
      return '';
    }

    return item.providerId ? `${item.name} (${item.providerId})` : item.name;
  };

  timetableLookupExpr = (item) => (item ? item.name : '');

  handleGridRef = (ref) => {
    this.dataGrid = ref;
  };

  handleRefresh = () => {
    this.onExecute();
  };

  handleOpenEdit = (rowData) => {
    this.openEditPopup(rowData);
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

  openEditPopup = async (rowData) => {
    this.closeAllMasterDetails();

    const detail = await this.loadProductDetail(rowData.id);

    if (!detail) {
      return;
    }

    this.setState({
      editPopupVisible: true,
      editProduct: createEditModel(detail)
    });
  };

  closeEditPopup = () => {
    this.setState({
      editPopupVisible: false,
      editProduct: null
    });
  };

  saveProduct = async (editProduct) => {
    if (!editProduct) {
      return;
    }

    if (!String(editProduct.localName || '').trim()) {
      notify('Заповни назву продукту', 'warning');
      return;
    }

    this.props.onLoading(true);

    try {
      await coreApi.put('/pimproduct', buildUpdateBody(editProduct));
      notify('Дані збережено', 'success', 1200);
      this.closeEditPopup();
      delete this.productDetailsCache[editProduct.id];
      await this.onExecute();
      await this.loadProductDetail(editProduct.id);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        notify(error.response.data.message, 'error');
      } else {
        notify('Не вдалося зберегти дані', 'error');
      }
    } finally {
      this.props.onLoading(false);
    }
  };

  render() {
    return (
      <div style={{ marginTop: '20px' }}>
        <ProductEditPopup
          visible={this.state.editPopupVisible}
          editProduct={this.state.editProduct}
          images={this.state.images}
          subcategories={this.state.subcategories}
          onClose={this.closeEditPopup}
          onSave={this.saveProduct}
          imagePreviewSrc={this.imagePreviewSrc}
          imageLookupExpr={this.imageLookupExpr}
          subcategoryLookupExpr={this.subcategoryLookupExpr}
          measureLookupExpr={this.measureLookupExpr}
        />
        <ProductsGrid
          onGridRef={this.handleGridRef}
          dataGrid={this.state.dataGrid}
          images={this.state.images}
          terminals={this.state.terminals}
          timetables={this.state.timetables}
          onRefresh={this.handleRefresh}
          onOpenEdit={this.handleOpenEdit}
          onLoadDetail={this.loadProductDetail}
          onSaveBarcodes={this.saveProductBarcodes}
          onSaveTerminals={this.saveProductTerminals}
          terminalLookupExpr={this.terminalLookupExpr}
          timetableLookupExpr={this.timetableLookupExpr}
          measureLookupExpr={this.measureLookupExpr}
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
)(Products);
