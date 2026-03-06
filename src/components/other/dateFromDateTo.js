import React, { Component } from 'react';
import DateBox from 'devextreme-react/date-box';

export default class DateFromDateTo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      dateFrom: props.defaultDateFrom ? props.defaultDateFrom : new Date(),
      dateTo: props.defaultDateTo ? props.defaultDateTo : new Date()
    };
  }

  onChangedDateFrom(e) {
    const nextState = {
      dateFrom: e.value,
      dateTo: this.state.dateTo
    };

    this.setState(nextState);
    this.onSyncParent(nextState);
  }

  onChangedDateTo(e) {
    const nextState = {
      dateFrom: this.state.dateFrom,
      dateTo: e.value
    };

    this.setState(nextState);
    this.onSyncParent(nextState);
  }

  onSyncParent(nextState) {
    this.props.onChangeDates(nextState);
  }

  render() {
    return (
      <div id="datFromdatTo">
        <div className="label-date">
          <span>дата з</span>
          <DateBox value={this.state.dateFrom} type="date" onValueChanged={this.onChangedDateFrom.bind(this)} />
        </div>
        <div className="label-date">
          <span>дата по</span>
          <DateBox value={this.state.dateTo} type="date" onValueChanged={this.onChangedDateTo.bind(this)} />
        </div>
      </div>
    );
  }
}
