import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ResearchProvider } from './context/ResearchContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Research from './pages/Research';
import History from './pages/History';
import About from './pages/About';

function App() {
  return (
    <BrowserRouter>
      <ResearchProvider>
        <div className="layout">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/research" element={<Research />} />
              <Route path="/history" element={<History />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </ResearchProvider>
    </BrowserRouter>
  );
}

export default App;
