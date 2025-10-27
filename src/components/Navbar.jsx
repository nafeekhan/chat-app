

// src/components/Navbar.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";
import { useDispatch } from "react-redux";
import { clearUser } from "../redux/userSlice";

export default function Navbar() {
  const user = useSelector((s) => s.user.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    await signOut(auth);
    dispatch(clearUser());
    navigate("/");
  };

  return (
    <nav className="bg-gray-800 text-white p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/home" className="text-xl font-bold">
          ChatApp
        </Link>
      </div>

      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <Link to="/home" className="hover:underline">Home</Link>
            <Link to="/users" className="hover:underline">Users</Link>
            <Link to="/profile" className="hover:underline">Profile</Link>
            <Link
              to="/settings"
              className="hover:underline flex items-center gap-1"
              title="Settings"
            >
              <span role="img" aria-label="settings">
                ⚙️
              </span>
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:underline">Login</Link>
            <Link to="/signup" className="hover:underline">Signup</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

