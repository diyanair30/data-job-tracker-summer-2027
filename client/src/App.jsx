import { NavLink, Route, Routes } from "react-router-dom";
import JobBoard from "./pages/JobBoard.jsx";
import Applications from "./pages/Applications.jsx";

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>Data Internship Tracker</h1>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Open Internships
          </NavLink>
          <NavLink to="/applications" className={({ isActive }) => (isActive ? "active" : "")}>
            My Applications
          </NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<JobBoard />} />
          <Route path="/applications" element={<Applications />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
