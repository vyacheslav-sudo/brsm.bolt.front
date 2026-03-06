import React, { Component } from 'react';
import { connect } from 'react-redux';
import { checkAccessRoute } from '../../../actions/auth';
import DataGrid, {
  Column,
  Export,
  Pager,
  Paging,
  SearchPanel,
  StateStoring
} from 'devextreme-react/data-grid';
import Form, {
  Label,
  RequiredRule,
  SimpleItem
} from 'devextreme-react/form';
import { Button } from 'devextreme-react/button';
import notify from 'devextreme/ui/notify';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { coreApi } from '../../../api/clientApi';

class Images extends Component {
  constructor(props) {
    super(props);

    this.form = React.createRef();
    this.fileInput = React.createRef();

    this.state = {
      dataGrid: [],
      modalDeleteImage: false,
      modalLoadImage: false,
      isNewImage: false,
      currRowImage: {},
      isNeedRefreshDataGrid: false,
      typeImageShow: 0 // 0 - url, 1 - base64
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

  handleSubmit = (e) => {
    e.preventDefault();

    const { currRowImage, isNewImage, typeImageShow } = this.state;

    if (!currRowImage.description || currRowImage.description.length === 0) {
      notify('Вкажіть назву зображення', 'error', 1000);
      return;
    }

    if (typeImageShow === 1 && (!currRowImage.image || currRowImage.image.length <= 0)) {
      notify('Виберіть зображення', 'error', 1000);
      return;
    }

    const body = {};

    if (currRowImage.sourceFullName) {
      body.originalFileName = currRowImage.sourceFullName;
    }

    if (currRowImage.description) {
      body.description = currRowImage.description;
    }

    if (currRowImage.image) {
      body.base64Image = currRowImage.image;
    }

    this.props.onLoading(true);

    const request = isNewImage
      ? coreApi.post('/image', body)
      : coreApi.put('/image', { ...body, id: currRowImage.id });

    request.then(() => {
      notify('Зображення успішно збережено', 'success', 1000);
      this.props.onLoading(false);
      this.setState({
        isNeedRefreshDataGrid: false,
        currRowImage: {},
        modalLoadImage: false
      });
      this.onExecute();
      if (this.form.current) {
        this.form.current.reset();
      }
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося зберегти зображення'), 'error', 1000);
    });
  };

  onExecute = () => {
    this.props.onLoading(true);

    coreApi.get('/image').then((response) => {
      this.props.onLoading(false);
      this.setState({
        dataGrid: response.data
      });
    }).catch((error) => {
      this.props.onLoading(false);
      notify(this.getErrorMessage(error, 'Не вдалося завантажити дані'), 'error');
    });
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
        onClick: this.clearFilterDataGrid,
        hint: 'Очистити всі фільтри'
      }
    });

    e.toolbarOptions.items.unshift({
      location: 'after',
      widget: 'dxButton',
      options: {
        icon: 'refresh',
        onClick: this.onExecute,
        hint: 'Оновити'
      }
    });

    e.toolbarOptions.items.unshift({
      location: 'after',
      widget: 'dxButton',
      options: {
        icon: 'plus',
        onClick: this.onAddImage,
        hint: 'Додати зображення'
      }
    });
  };

  clearFilterDataGrid = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.clearFilter();
      this.dataGrid.instance.searchByText('');
    }
  };

  refreshGridDimensions = () => {
    if (this.dataGrid && this.dataGrid.instance) {
      this.dataGrid.instance.updateDimensions();
    }
  };

  imageRenderDataGrid = (e) => (
    e.data.imageUrl ? (
      <a href={`${e.data.imageUrl}?${Math.random()}`} rel="noopener noreferrer" target="_blank">
        <img
          src={`${e.data.imageUrl}?${Math.random()}`}
          alt=""
          width="50"
          onLoad={this.refreshGridDimensions}
          onError={this.refreshGridDimensions}
        />
      </a>
    ) : null
  );

  onCloseModalDelImage = () => {
    this.setState({
      modalDeleteImage: false
    });
  };

  onCloseModalLoadImage = () => {
    this.setState({
      modalLoadImage: false
    });

    if (this.state.isNeedRefreshDataGrid) {
      this.onExecute();
      this.setState({
        isNeedRefreshDataGrid: false
      });
    }
  };

  onExecuteDeleteImage = () => {
    this.props.onLoading(true);

    coreApi.delete(`/image/${this.state.currRowImage.id}`).then(() => {
      this.props.onLoading(false);
      this.onCloseModalDelImage();
      this.onExecute();
    }).catch(() => {
      this.props.onLoading(false);
      notify('Не вдалося видалити зображення', 'error', 1000);
    });
  };

  onEditImage = (e) => {
    this.setState({
      currRowImage: { ...e.row.data },
      isNewImage: false,
      typeImageShow: 0,
      modalLoadImage: true
    });
  };

  onAddImage = () => {
    this.setState({
      currRowImage: {},
      isNewImage: true,
      typeImageShow: 1,
      modalLoadImage: true
    });
  };

  onDeleteImage = (e) => {
    this.setState({
      currRowImage: e.row.data,
      modalDeleteImage: true
    });
  };

  imageArticlesRender = () => {
    const { currRowImage, typeImageShow } = this.state;
    const imageUrlPreview = currRowImage.imageUrl ? (
      <a href={currRowImage.imageUrl} rel="noopener noreferrer" target="_blank">
        <img
          src={currRowImage.imageUrl}
          alt=""
          width="175"
          style={{ marginBottom: '10px', display: 'block' }}
        />
      </a>
    ) : null;
    const imageBase64Preview = currRowImage.image ? (
      <img
        src={`data:image/${currRowImage.imageType};base64,${currRowImage.image}`}
        alt=""
        width="175"
        style={{ marginBottom: '10px', display: 'block' }}
      />
    ) : null;

    return (
      <div className="fileuploader-container">
        <center>
          {typeImageShow === 0 ? imageUrlPreview : imageBase64Preview}
          <input
            type="file"
            accept="image/*"
            onChange={this.onSelectedImage}
            hidden={true}
            ref={this.fileInput}
          />
          <Button
            text="Виберіть зображення"
            type="normal"
            stylingMode="contained"
            onClick={this.onSelectImage}
          />
        </center>
      </div>
    );
  };

  onSelectImage = () => {
    if (this.fileInput.current) {
      this.fileInput.current.click();
    }
  };

  onSelectedImage = () => {
    this.setState({
      typeImageShow: 1
    });

    const selectedFile = this.fileInput.current && this.fileInput.current.files
      ? this.fileInput.current.files[0]
      : null;

    if (!selectedFile) {
      notify('При виборі файлу сталася помилка', 'error', 1000);
      return;
    }

    if (selectedFile.type && selectedFile.type.indexOf('image') === -1) {
      notify('Файл повинен бути зображенням', 'error', 1000);
      return;
    }

    if (selectedFile.size > 1000000) {
      notify('Розмір файлу повинен бути меншим ніж 1 МБайт', 'error', 1000);
      return;
    }

    const name = selectedFile.name.substring(0, selectedFile.name.indexOf('.'));
    const type = selectedFile.type.replace('image/', '');
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      const fileData = event.target.result;
      const base64Data = fileData.substring(fileData.indexOf(',') + 1);

      this.setState((prevState) => ({
        currRowImage: {
          ...prevState.currRowImage,
          image: base64Data,
          imageType: type,
          sourceName: name,
          sourceFullName: selectedFile.name
        }
      }));
    });

    reader.readAsDataURL(selectedFile);
  };

  formFieldDataChanged = () => {};

  render() {
    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{ marginTop: '20px' }}>
          <DataGrid
            ref={(ref) => { this.dataGrid = ref; }}
            id="gridImages"
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
            <Export enabled={true} fileName="Images" />
            <SearchPanel visible={true} />
            <StateStoring enabled={true} type="localStorage" storageKey="Images" />
            <Paging defaultPageSize={50} />
            <Pager
              showPageSizeSelector={true}
              allowedPageSizes={[10, 20, 50]}
              showInfo={true}
            />
            <Column dataField="id" caption="ID зображення" />
            <Column dataField="description" caption="Назва зображення" />
            <Column dataField="imageUrl" visible={false} caption="Картинка" />
            <Column caption="Картинка" alignment="center" width={120} cellRender={this.imageRenderDataGrid} />
            <Column dataField="originalFileName" caption="Назва файлу" />
            <Column dataField="width" caption="Ширина зображення" />
            <Column dataField="height" caption="Висота зображення" />
            <Column dataField="mimeType" caption="Тип контенту" />
            <Column dataField="extension" caption="Тип файлу" />
            <Column dataField="editDate" caption="Дата редаг." dataType="datetime" />
            <Column
              type="buttons"
              width={110}
              fixed={true}
              fixedPosition="right"
              buttons={[
                {
                  hint: 'Редагувати',
                  icon: 'edit',
                  visible: true,
                  onClick: this.onEditImage
                },
                {
                  hint: 'Видалити',
                  icon: 'trash',
                  visible: false,
                  onClick: this.onDeleteImage
                }
              ]}
            />
          </DataGrid>
        </div>

        <Modal isOpen={this.state.modalDeleteImage}>
          <ModalBody>
            Ви дійсно бажаєте видалити зображення <b>{this.state.currRowImage.description || ''}</b>?
          </ModalBody>
          <ModalFooter>
            <Button
              text="Так"
              type="danger"
              stylingMode="contained"
              onClick={this.onExecuteDeleteImage}
            />
            {' '}
            <Button
              text="Ні"
              type="normal"
              stylingMode="contained"
              onClick={this.onCloseModalDelImage}
            />
          </ModalFooter>
        </Modal>

        <Modal isOpen={this.state.modalLoadImage}>
          <ModalHeader>
            {this.state.isNewImage ? 'Додавання зображення' : 'Редагування зображення'}
          </ModalHeader>
          <ModalBody>
            <form onSubmit={this.handleSubmit} ref={this.form}>
              <Form
                formData={this.state.currRowImage}
                onFieldDataChanged={this.formFieldDataChanged}
                readOnly={false}
                showValidationSummary={true}
                validationGroup="imageData"
              >
                <SimpleItem dataField="description" editorType="dxTextBox">
                  <Label text="Назва зображення" />
                  <RequiredRule message="Назва зображення - обов'язкове поле" />
                </SimpleItem>

                <SimpleItem dataField="image" render={this.imageArticlesRender}>
                  <Label text="Зображення" />
                  <RequiredRule message="Зображення - обов'язкове поле" />
                </SimpleItem>
              </Form>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <Button
                  text="Зберегти"
                  type="success"
                  stylingMode="contained"
                  useSubmitBehavior={true}
                />
                <Button
                  text="Вийти"
                  type="normal"
                  stylingMode="contained"
                  onClick={this.onCloseModalLoadImage}
                />
              </div>
            </form>
          </ModalBody>
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
)(Images);
