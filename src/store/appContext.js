import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext({});

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const value = {
    currentAnalysis,
    setCurrentAnalysis,
    analysisHistory,
    setAnalysisHistory,
    statistics,
    setStatistics,
    isAnalyzing,
    setIsAnalyzing,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};