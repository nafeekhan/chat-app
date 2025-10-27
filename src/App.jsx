

// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { useSelector } from "react-redux";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Home from "./components/Home";
import UserList from "./components/UserList";
import Profile from "./components/Profile";
import ChatWindow from "./components/ChatWindow";
import Settings from "./components/Settings";
import Gallery from "./components/Gallery";

export default function App() {
  const user = useSelector((s) => s.user.user);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/home" /> : <Signup />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" />} />
        <Route path="/users" element={user ? <UserList /> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
        <Route path="/profile/:uid" element={user ? <Profile /> : <Navigate to="/" />} />
        <Route path="/settings" element={user ? <Settings /> : <Navigate to="/" />} />
        <Route path="/gallery" element={user ? <Gallery /> : <Navigate to="/" />} />
        <Route path="/gallery/:uid" element={user ? <Gallery /> : <Navigate to="/" />} />
        <Route path="/chat/:chatId" element={user ? <ChatWindow /> : <Navigate to="/" />} />
        {/* fallback */}
        <Route path="*" element={<Navigate to={user ? "/home" : "/"} />} />
      </Routes>
    </Router>
  );
}

