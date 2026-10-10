import React from 'react';
import ReactDOM from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './styles/app.css';
import {Theme} from '@astryxdesign/core';
import {kametiTheme} from './theme';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Theme theme={kametiTheme} mode="light">
      <App />
    </Theme>
  </React.StrictMode>,
);
