import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App.jsx';
import './styles.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#176b5b', dark: '#104c43', contrastText: '#fff' },
    secondary: { main: '#bb573d' },
    background: { default: '#f5f6f2', paper: '#ffffff' },
    text: { primary: '#202a27', secondary: '#64716c' },
    success: { main: '#237653' },
    error: { main: '#b44738' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Aptos", "Segoe UI", sans-serif',
    h1: { fontSize: 28, fontWeight: 700 },
    h2: { fontSize: 22, fontWeight: 700 },
    h3: { fontSize: 18, fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 650 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);