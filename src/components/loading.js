import React, { Component } from 'react';

function LoadingSpinner(props) {

    if(!props.visible) {
        return (<></>);
    }

    let text = props.text ? props.text : 'Завантаження ...';

    switch(props.type) {

        case "main":
            return (
                <div style={props.style}>
                        <img width="64px" alt={props.text} style={{paddingRight: "20px"}} src="/loading.svg"></img>
                        <span>{text}</span>
                    </div>
            );        
            
        case "login": 
            return (
                <div style={props.style}>
                        <img width="35px" alt={props.text} style={{paddingRight: "10px"}} src="/loading.svg"></img>
                        <span>{text}</span>
                    </div>
            );

        default:
            return;
    }
}

export default class Loading extends Component {  

render() {
     return (        
       <LoadingSpinner visible={this.props.visible} type={this.props.type} text={this.props.text} style={this.props.style} />
     );
   }
}