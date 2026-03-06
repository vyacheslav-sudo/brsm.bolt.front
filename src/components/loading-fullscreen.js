import React, { Component } from 'react';
import './loading-fullscreen.css';

export default class LoadingFullScreen extends Component {  

render() {
     return (
        <div className="loading" hidden={!this.props.visible}>
            <div className="loader"></div>
         </div>
     );
   }
}