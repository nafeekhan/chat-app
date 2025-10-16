

// src/components/Signup.jsx
import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { useNavigate, Link } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/userSlice";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSignup = async () => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCred.user;

      // set displayName on Firebase Auth
      await updateProfile(fbUser, { displayName: name });

      // create user doc in firestore
      const userDoc = {
        name,
        email,
        status: "Hey there! I am using ChatApp.",
        photoURL: "",
      };
      await setDoc(doc(db, "users", fbUser.uid), userDoc);

      // update redux
      dispatch(
        setUser({
          uid: fbUser.uid,
          displayName: name,
          email: fbUser.email,
          photoURL: "",
          status: userDoc.status,
        })
      );

      navigate("/home");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-96">
        <h2 className="text-2xl mb-4">Sign up</h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full border p-2 rounded mb-3"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border p-2 rounded mb-3"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          className="w-full border p-2 rounded mb-4"
        />
        <button
          onClick={handleSignup}
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          Signup
        </button>

        <p className="mt-3 text-sm">
          Already have an account? <Link to="/" className="text-blue-600">Login</Link>
        </p>
      </div>
    </div>
  );
}


