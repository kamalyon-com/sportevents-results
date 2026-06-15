import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const mountEl =
  document.getElementById('sportevents-results') ||
  document.getElementById('kamalyon-race-results') ||
  document.getElementById('root');

const eventPrefix = mountEl?.getAttribute('data-prefix') ?? undefined;
const themeAttr = mountEl?.getAttribute('data-theme');
const initialTheme: 'dark' | 'light' = themeAttr === 'light' ? 'light' : 'dark';

const root = ReactDOM.createRoot(mountEl as HTMLElement);
root.render(
  <React.StrictMode>
    <App eventPrefix={eventPrefix} theme={initialTheme} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
