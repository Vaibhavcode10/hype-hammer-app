import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { SportType } from './types';
import { SPORT_THEMES, SPORT_ICONS } from './themes';
import HomePage from './pages/HomePage';
import SetupPage from './pages/SetupPage';
import AuctionPage from './pages/AuctionPage';

const App: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState<SportType>(SportType.CRICKET);
  const [lastPage, setLastPage] = useState<string>('/');

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <HomePage 
              onSelectSport={(sport) => {
                setSelectedSport(sport);
                setLastPage('/auction');
              }}
            />
          } 
        />
        <Route 
          path="/setup/:sport" 
          element={
            <SetupPage 
              sport={selectedSport}
              onSetup={(sport) => {
                setSelectedSport(sport);
                setLastPage('/auction');
              }}
            />
          } 
        />
        <Route 
          path="/auction/:sport" 
          element={
            <AuctionPage 
              sport={selectedSport}
              theme={SPORT_THEMES[selectedSport.toLowerCase() as keyof typeof SPORT_THEMES] || SPORT_THEMES.cricket}
              onBack={() => setLastPage('/')}
            />
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;
