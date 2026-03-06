import React, { Component } from 'react';

export class NotFound extends Component {
  render() {
    return (
      <div id="notFoundContainer">
        <b>Сторінку не знайдено</b><br />
        <a href="/">повернутися на головну</a>
      </div>
    );
  }
}
