import React, { Component } from 'react';
import { connect } from 'react-redux';
import { checkAccessRoute } from '../../../actions/auth';
import { coreApi } from '../../../api/clientApi';
import DataGrid, { Column, Paging, Pager, SearchPanel } from 'devextreme-react/data-grid';
import { NumberBox } from 'devextreme-react/number-box';
import { SelectBox } from 'devextreme-react/select-box';
import { Button } from 'devextreme-react/button';
import Form, { SimpleItem, Label, RequiredRule, CustomRule } from 'devextreme-react/form';
import TabPanel, { Item } from 'devextreme-react/tab-panel';
import {
  Card,
  CardHeader,
  Form as BsForm,
  FormGroup,
  Input,
  Label as BsLabel,
  FormFeedback,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter
} from 'reactstrap';
import notify from 'devextreme/ui/notify';
import { JsonToTable } from 'react-json-to-table';
import './orders-update.css';

const formatMoney = (value, currency) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  const rounded = Math.round(Number(value) * 100) / 100;
  return `${rounded.toFixed(2)}${currency ? ' ' + currency.toUpperCase() : ''}`;
};

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

const extractErrorMessage = (error, fallback) => {
  if (error && error.response && error.response.data) {
    const data = error.response.data;
    if (data.err_descr) return data.err_descr;
    if (data.message) return data.message;
  }
  if (error && error.message) return error.message;
  return fallback;
};

class CardOrderFind extends Component {
  constructor(props) {
    super(props);

    this.state = {
      orderCode: '',
      orderCodeError: ''
    };

    this.form = React.createRef();
    this.onFindOrder = this.onFindOrder.bind(this);
  }

  async onFindOrder() {
    const codeToEdit = parseInt(this.state.orderCode, 10);

    if (!Number.isInteger(codeToEdit) || codeToEdit < 100000 || codeToEdit > 999999) {
      this.setState({ orderCodeError: 'Вкажіть 6-значний код замовлення' });
      notify('Вкажіть вірний код замовлення', 'error', 2000);
      return;
    }

    this.setState({ orderCodeError: '' });

    let accessToken = null;
    let order = null;
    let menu = null;

    this.props.parentProps.onLoading(true);

    try {
      const loginResp = await coreApi.post('/token/OrderLogin', { CodeToEdit: codeToEdit });
      accessToken = loginResp.data.AccessToken;

      const orderResp = await coreApi.get('/OrderEdit', {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
      order = orderResp.data;

      if (!order || order.canEdit === false) {
        throw new Error('Замовлення вже неможливо редагувати');
      }

      const menuResp = await coreApi.get('/OrderEdit/Menu', {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
      menu = menuResp.data;
    } catch (error) {
      this.props.parentProps.onLoading(false);
      const errCode = error && error.response && error.response.data ? error.response.data.err_code : null;
      const message = errCode === 284
        ? 'Забагато спроб. Спробуйте через 10 хвилин.'
        : 'Замовлення для редагування не знайдено';
      notify(message, 'error', 3000);
      return;
    }

    this.props.parentProps.onLoading(false);
    this.props.onFindedOrder(accessToken, order, menu);
  }

  render() {
    return (
      <div className="col-12" id="orderFindContainer">
        <div className="col-sm-9 col-md-7 mx-auto p-0 pb-3" style={{ maxWidth: '350px', marginTop: '50px' }}>
          <Card className="card-find-order">
            <CardHeader tag="h4">Пошук замовлення</CardHeader>
            <BsForm
              onSubmit={(e) => {
                e.preventDefault();
                this.onFindOrder();
              }}
              className="form-order-find"
              ref={this.form}
              noValidate
            >
              <FormGroup>
                <BsLabel for="orderCode">Код замовлення</BsLabel>
                <Input
                  name="orderCode"
                  id="orderCode"
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={this.state.orderCode}
                  invalid={Boolean(this.state.orderCodeError)}
                  onChange={(e) => this.setState({ orderCode: e.target.value.replace(/\D/g, ''), orderCodeError: '' })}
                />
                <FormFeedback>{this.state.orderCodeError}</FormFeedback>
              </FormGroup>
              <Button
                style={{ width: '100%' }}
                text="Знайти"
                type="default"
                stylingMode="contained"
                useSubmitBehavior={true}
              />
            </BsForm>
          </Card>
        </div>
      </div>
    );
  }
}

class AddDishFromMenuModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedCategory: null,
      selectedSubcategory: null,
      selectedDish: null,
      amount: 1
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.isOpen !== this.props.isOpen && this.props.isOpen) {
      this.setState({
        selectedCategory: null,
        selectedSubcategory: null,
        selectedDish: null,
        amount: 1
      });
    }
  }

  getSubcategories() {
    const cat = this.state.selectedCategory;
    return cat && Array.isArray(cat.subcategories) ? cat.subcategories : [];
  }

  getDishes() {
    const cat = this.state.selectedCategory;
    if (!cat) return [];

    const hasSubs = Array.isArray(cat.subcategories) && cat.subcategories.length > 0;
    if (hasSubs) {
      const sub = this.state.selectedSubcategory;
      return sub && Array.isArray(sub.dishes) ? sub.dishes : [];
    }

    return Array.isArray(cat.dishes) ? cat.dishes : [];
  }

  onAdd() {
    const dish = this.state.selectedDish;
    const amount = Number(this.state.amount);

    if (!dish) {
      notify('Виберіть страву', 'error', 2000);
      return;
    }
    if (!Number.isInteger(amount) || amount < 1) {
      notify('Кількість повинна бути цілим числом більше 0', 'error', 2000);
      return;
    }

    this.props.onAdd({
      sku: String(dish.sku),
      name: dish.name,
      unitPrice: Number(dish.price),
      amount: amount,
      currency: this.props.currency
    });
  }

  render() {
    const cat = this.state.selectedCategory;
    const hasSubs = cat && Array.isArray(cat.subcategories) && cat.subcategories.length > 0;
    const dishes = this.getDishes();

    return (
      <Modal isOpen={this.props.isOpen} toggle={this.props.onClose}>
        <ModalHeader>Додавання страви з меню</ModalHeader>
        <ModalBody>
          <Form formData={this.state}>
            <SimpleItem>
              <Label text="Категорія" />
              <SelectBox
                dataSource={this.props.categories || []}
                displayExpr="name"
                placeholder="Виберіть категорію"
                searchEnabled={true}
                value={this.state.selectedCategory}
                onValueChanged={(e) =>
                  this.setState({
                    selectedCategory: e.value,
                    selectedSubcategory: null,
                    selectedDish: null
                  })
                }
              />
            </SimpleItem>

            {hasSubs ? (
              <SimpleItem>
                <Label text="Підкатегорія" />
                <SelectBox
                  dataSource={this.getSubcategories()}
                  displayExpr="name"
                  placeholder="Виберіть підкатегорію"
                  searchEnabled={true}
                  disabled={!this.state.selectedCategory}
                  value={this.state.selectedSubcategory}
                  onValueChanged={(e) =>
                    this.setState({
                      selectedSubcategory: e.value,
                      selectedDish: null
                    })
                  }
                />
              </SimpleItem>
            ) : null}

            <SimpleItem>
              <Label text="Страва" />
              <SelectBox
                dataSource={dishes}
                displayExpr={(item) => (item ? `${item.name} — ${formatMoney(item.price, this.props.currency)}` : '')}
                placeholder="Виберіть страву"
                searchEnabled={true}
                disabled={dishes.length === 0}
                value={this.state.selectedDish}
                onValueChanged={(e) => this.setState({ selectedDish: e.value })}
              />
              <RequiredRule message="Страва — обов'язкове поле" />
            </SimpleItem>

            <SimpleItem>
              <Label text="Кількість" />
              <NumberBox
                min={1}
                step={1}
                showSpinButtons={true}
                value={this.state.amount}
                onValueChanged={(e) => this.setState({ amount: e.value })}
              />
              <CustomRule
                validationCallback={(e) => Number.isInteger(Number(e.value)) && Number(e.value) > 0}
                message="Кількість повинна бути цілим числом більше 0"
              />
            </SimpleItem>
          </Form>

          {this.state.selectedDish ? (
            <div className="orders-update-menu-price">
              Ціна з меню: <b>{formatMoney(this.state.selectedDish.price, this.props.currency)}</b>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button text="Додати" type="success" stylingMode="contained" onClick={this.onAdd.bind(this)} />
          {' '}
          <Button text="Скасувати" type="normal" stylingMode="contained" onClick={this.props.onClose} />
        </ModalFooter>
      </Modal>
    );
  }
}

class OrderEditView extends Component {
  constructor(props) {
    super(props);

    const originalItems = (props.order.items || []).map((i) => ({
      sku: String(i.sku),
      name: i.name,
      amount: Number(i.amount),
      unitPrice: Number(i.unitPrice),
      currency: i.currency
    }));

    this.state = {
      editedItems: originalItems.map((i) => ({ ...i, originalAmount: i.amount, isNew: false })),
      isShowAddDishModal: false,
      isShowConfirmModal: false
    };

    this.onAmountChanged = this.onAmountChanged.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);
    this.onAddDish = this.onAddDish.bind(this);
    this.onConfirmSave = this.onConfirmSave.bind(this);
  }

  getOriginalCurrency() {
    const firstWithCurrency = (this.props.order.items || []).find((i) => i.currency);
    return firstWithCurrency ? firstWithCurrency.currency : 'uah';
  }

  computeRowTotal(item) {
    return roundMoney(Number(item.amount) * Number(item.unitPrice));
  }

  computeNewTotal() {
    return roundMoney(
      this.state.editedItems.reduce((sum, i) => sum + Number(i.amount) * Number(i.unitPrice), 0)
    );
  }

  hasChanges() {
    const originalSkus = new Set((this.props.order.items || []).map((i) => String(i.sku)));
    const currentSkus = new Set(this.state.editedItems.map((i) => i.sku));

    if (originalSkus.size !== currentSkus.size) return true;
    for (const sku of originalSkus) {
      if (!currentSkus.has(sku)) return true;
    }
    for (const item of this.state.editedItems) {
      if (item.isNew) return true;
      if (Number(item.amount) !== Number(item.originalAmount)) return true;
    }
    return false;
  }

  onAmountChanged(sku, newValue) {
    const amount = Math.max(1, Math.floor(Number(newValue) || 1));
    this.setState({
      editedItems: this.state.editedItems.map((i) =>
        i.sku === sku ? { ...i, amount } : i
      )
    });
  }

  onRemoveItem(sku) {
    this.setState({
      editedItems: this.state.editedItems.filter((i) => i.sku !== sku)
    });
  }

  onAddDish(dish) {
    const existing = this.state.editedItems.find((i) => i.sku === dish.sku);

    if (existing) {
      this.setState({
        editedItems: this.state.editedItems.map((i) =>
          i.sku === dish.sku ? { ...i, amount: Number(i.amount) + Number(dish.amount) } : i
        ),
        isShowAddDishModal: false
      });
      notify(`Додано до існуючої позиції: ${dish.name}`, 'info', 2000);
      return;
    }

    const originalItem = (this.props.order.items || []).find((i) => String(i.sku) === dish.sku);

    this.setState({
      editedItems: [
        ...this.state.editedItems,
        {
          sku: dish.sku,
          name: dish.name,
          amount: Number(dish.amount),
          unitPrice: originalItem ? Number(originalItem.unitPrice) : Number(dish.unitPrice),
          currency: (originalItem && originalItem.currency) || dish.currency || this.getOriginalCurrency(),
          isNew: !originalItem,
          originalAmount: originalItem ? Number(originalItem.amount) : 0
        }
      ],
      isShowAddDishModal: false
    });
  }

  onConfirmSave() {
    const data = {
      Items: this.state.editedItems.map((i) => ({
        Sku: i.sku,
        Amount: Number(i.amount)
      }))
    };

    this.props.parentProps.onLoading(true);

    coreApi
      .post('/OrderEdit', data, { headers: { Authorization: 'Bearer ' + this.props.authToken } })
      .then(() => {
        this.props.parentProps.onLoading(false);
        this.setState({ isShowConfirmModal: false });
        notify('Замовлення успішно оновлено', 'success', 2500);
        this.props.onOrderUpdateComplete();
      })
      .catch((error) => {
        this.props.parentProps.onLoading(false);
        this.setState({ isShowConfirmModal: false });
        notify(extractErrorMessage(error, 'Не вдалося зберегти зміни'), 'error', 4000);
      });
  }

  renderStatusBadge() {
    const status = this.props.order.boltStatus;
    const cls =
      'orders-update-status-badge ' +
      (status === 'RECEIVED' ? 'received' : status === 'CANCELLED' ? 'cancelled' : '');
    return <span className={cls}>{status}</span>;
  }

  renderSummary() {
    const original = roundMoney(this.props.order.totalOrderPrice);
    const current = this.computeNewTotal();
    const diff = roundMoney(current - original);
    const isOver = current > original;
    const cls = isOver ? 'over' : 'ok';
    const currency = this.getOriginalCurrency();
    const hasChanges = this.hasChanges();
    const canSave = hasChanges && !isOver && this.state.editedItems.length > 0;

    const diffSign = diff > 0 ? '+' : '';
    const percent = original > 0 ? Math.round((diff / original) * 1000) / 10 : 0;

    return (
      <div className="orders-update-summary">
        <div className="summary-grid">
          <div className="summary-cell">
            <span className="label">Оригінальна сума</span>
            <span className="value">{formatMoney(original, currency)}</span>
          </div>
          <div className={'summary-cell ' + cls}>
            <span className="label">Нова сума</span>
            <span className="value">{formatMoney(current, currency)}</span>
          </div>
          <div className={'summary-cell ' + cls}>
            <span className="label">Різниця</span>
            <span className="value">
              {diffSign}
              {formatMoney(diff, currency)} ({diffSign}
              {percent}%)
            </span>
          </div>
          <div className="summary-actions">
            <Button
              text="Зберегти зміни"
              type="success"
              stylingMode="contained"
              disabled={!canSave}
              onClick={() => this.setState({ isShowConfirmModal: true })}
            />
          </div>
        </div>
        {isOver ? (
          <div className="orders-update-inline-hint" style={{ color: '#842029', marginTop: 8 }}>
            Нова сума перевищує оригінальну — зменшіть кількість або видаліть позиції.
          </div>
        ) : !hasChanges ? (
          <div className="orders-update-inline-hint" style={{ marginTop: 8 }}>
            Внесіть зміни, щоб зберегти.
          </div>
        ) : null}
      </div>
    );
  }

  amountCellRender(cellData) {
    const item = cellData.data;
    return (
      <NumberBox
        min={1}
        step={1}
        showSpinButtons={true}
        value={Number(item.amount)}
        onValueChanged={(e) => this.onAmountChanged(item.sku, e.value)}
      />
    );
  }

  originalAmountCellRender(cellData) {
    const item = cellData.data;
    return item.isNew ? <span style={{ color: '#6c757d' }}>—</span> : <span>{item.originalAmount}</span>;
  }

  rowTotalCellRender(cellData) {
    const item = cellData.data;
    return formatMoney(this.computeRowTotal(item), item.currency);
  }

  unitPriceCellRender(cellData) {
    const item = cellData.data;
    return formatMoney(item.unitPrice, item.currency);
  }

  onRowPrepared(e) {
    if (!e.data) return;
    if (e.data.isNew) {
      e.rowElement.classList.add('orders-update-row-new');
    } else if (Number(e.data.amount) !== Number(e.data.originalAmount)) {
      e.rowElement.classList.add('orders-update-row-modified');
    }
  }

  onToolbarPreparing(e) {
    e.toolbarOptions.items.unshift({
      location: 'before',
      widget: 'dxButton',
      options: {
        icon: 'plus',
        text: 'Додати з меню',
        hint: 'Додати страву з меню',
        onClick: () => this.setState({ isShowAddDishModal: true })
      }
    });
  }

  renderOriginalJsonTab() {
    let parsed = null;
    try {
      parsed = this.props.order.rawData ? JSON.parse(this.props.order.rawData) : {};
    } catch (e) {
      return (
        <div className="orders-update-tab-json">
          <div style={{ color: '#842029' }}>Не вдалося розібрати оригінальні дані замовлення.</div>
          <pre>{this.props.order.rawData}</pre>
        </div>
      );
    }

    const formatKeys = (obj) => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map(formatKeys);
      if (typeof obj !== 'object') return obj;
      const out = {};
      for (const k in obj) {
        const newKey = k.replaceAll('_', ' ').toUpperCase();
        out[newKey] = formatKeys(obj[k]);
      }
      return out;
    };

    return (
      <div className="orders-update-tab-json">
        <JsonToTable json={formatKeys(parsed)} />
      </div>
    );
  }

  render() {
    const order = this.props.order;
    const currency = this.getOriginalCurrency();

    return (
      <div className="orders-update-root">
        <div className="orders-update-header">
          <h4>
            Замовлення № {order.orderId} {this.renderStatusBadge()}
          </h4>
          <div className="meta">
            <b>Посилання:</b> {order.orderReferenceId} &nbsp;|&nbsp;
            <b>Провайдер:</b> {order.providerId}
            {order.azkOrderStatus ? (
              <>
                &nbsp;|&nbsp; <b>Статус обробки:</b> {order.azkOrderStatus}
              </>
            ) : null}
          </div>
        </div>

        {this.renderSummary()}

        <TabPanel>
          <Item title="Редагування позицій">
            <div style={{ padding: 10 }}>
              <DataGrid
                dataSource={this.state.editedItems}
                keyExpr="sku"
                showBorders={true}
                rowAlternationEnabled={true}
                columnAutoWidth={true}
                onToolbarPreparing={this.onToolbarPreparing.bind(this)}
                onRowPrepared={this.onRowPrepared.bind(this)}
              >
                <SearchPanel visible={true} />
                <Paging defaultPageSize={25} />
                <Pager showPageSizeSelector={true} allowedPageSizes={[10, 25, 50]} showInfo={true} />
                <Column dataField="name" caption="Назва" />
                <Column dataField="sku" caption="SKU" width={110} />
                <Column
                  dataField="originalAmount"
                  caption="Оригінальна к-сть"
                  width={140}
                  alignment="right"
                  cellRender={this.originalAmountCellRender.bind(this)}
                />
                <Column
                  dataField="amount"
                  caption="Нова к-сть"
                  width={140}
                  alignment="right"
                  cellRender={this.amountCellRender.bind(this)}
                />
                <Column
                  dataField="unitPrice"
                  caption="Ціна за од."
                  width={130}
                  alignment="right"
                  cellRender={this.unitPriceCellRender.bind(this)}
                />
                <Column
                  caption="Сума"
                  width={140}
                  alignment="right"
                  cellRender={this.rowTotalCellRender.bind(this)}
                />
                <Column
                  type="buttons"
                  width={70}
                  buttons={[
                    {
                      hint: 'Видалити',
                      icon: 'trash',
                      onClick: (e) => this.onRemoveItem(e.row.data.sku)
                    }
                  ]}
                />
              </DataGrid>
            </div>
          </Item>
          <Item title="Оригінал замовлення">{this.renderOriginalJsonTab()}</Item>
        </TabPanel>

        <AddDishFromMenuModal
          isOpen={this.state.isShowAddDishModal}
          onClose={() => this.setState({ isShowAddDishModal: false })}
          categories={this.props.menu ? this.props.menu.categories : []}
          currency={currency}
          onAdd={this.onAddDish}
        />

        <Modal isOpen={this.state.isShowConfirmModal}>
          <ModalBody>
            Підтвердити збереження змін для замовлення <b>№ {order.orderId}</b>?
            <div style={{ marginTop: 8 }}>
              Нова сума: <b>{formatMoney(this.computeNewTotal(), currency)}</b>
              {' '}(оригінальна: {formatMoney(order.totalOrderPrice, currency)})
            </div>
          </ModalBody>
          <ModalFooter>
            <Button text="Так" type="success" stylingMode="contained" onClick={this.onConfirmSave} />
            {' '}
            <Button
              text="Ні"
              type="normal"
              stylingMode="contained"
              onClick={() => this.setState({ isShowConfirmModal: false })}
            />
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}

class OrdersUpdate extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showFindOrder: true,
      accessToken: null,
      order: undefined,
      menu: undefined
    };

    this.onOrderUpdateComplete = this.onOrderUpdateComplete.bind(this);
  }

  componentDidMount() {
    checkAccessRoute(this.props);
  }

  onOrderUpdateComplete() {
    this.setState({
      showFindOrder: true,
      accessToken: null,
      order: undefined,
      menu: undefined
    });
  }

  render() {
    if (this.state.showFindOrder || !this.state.order) {
      return (
        <CardOrderFind
          parentProps={this.props}
          onFindedOrder={(token, order, menu) => {
            this.setState({
              accessToken: token,
              order: order,
              menu: menu,
              showFindOrder: false
            });
          }}
        />
      );
    }

    return (
      <OrderEditView
        authToken={this.state.accessToken}
        order={this.state.order}
        menu={this.state.menu}
        onOrderUpdateComplete={this.onOrderUpdateComplete}
        parentProps={this.props}
      />
    );
  }
}

export default connect(
  (state) => ({
    auth: state.auth,
    settings: state.settings,
    router: state.router
  }),
  (dispatch) => ({
    onLoading(item) {
      dispatch({ type: 'LOADING_SHOW', payload: item });
    }
  })
)(OrdersUpdate);
