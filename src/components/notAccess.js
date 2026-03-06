import React, { Component } from 'react';
// import { Link } from 'react-router-dom';

export class NotAccess extends Component {  

 render() {
     return (
       <div>
         <b>Доступ не дозволено</b><br />
         <a href='/'>повернутися на головну</a>
       </div>
     );
   }
}