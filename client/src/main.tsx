import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
// Keep the shared overrides last when route modules load independently.
import './styles/sunPuzzle.css';
import './styles/projectWorkshop.css';
import './styles/journal.css';
import './styles/archiveOpening.css';
import './styles/water.css';
import './styles/waterFigure.css';
import './styles/projectArchive.css';
import './styles/workbench.css';
import './styles/business.css';
import './styles/global.css';
import './styles/coastal.css';
import './styles/typography.css';
import './styles/mobile-finish.css';
import './styles/optical.css';
import './styles/reading-flow.css';
import './styles/world-layout.css';
import './styles/journey-mobile.css';
import './styles/tide-edition.css';
import './styles/folio-passage.css';
import './styles/case-edition.css';
import './styles/case-passage.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
