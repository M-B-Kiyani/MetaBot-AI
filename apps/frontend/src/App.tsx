import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App(): JSX.Element {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">
              AI Booking Voice Assistant
            </h1>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function HomePage(): JSX.Element {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
          <p className="text-gray-500">Frontend application placeholder</p>
        </div>
      </div>
    </div>
  );
}

export default App;