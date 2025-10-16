
// // src/main.jsx
// import React from "react";
// import ReactDOM from "react-dom/client";
// import App from "./App";
// import "./index.css";

// import { Provider } from "react-redux";
// import { store } from "./redux/store";

// import { auth, db } from "./firebase/config";
// import { onAuthStateChanged } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";
// import { setUser, clearUser } from "./redux/userSlice";

// // listen to firebase auth state and populate redux user with firestore info
// onAuthStateChanged(auth, async (fbUser) => {
//   if (fbUser) {
//     // load user doc from firestore
//     const userDocRef = doc(db, "users", fbUser.uid);
//     const userSnap = await getDoc(userDocRef);
//     const userData = userSnap.exists() ? userSnap.data() : {};
//     store.dispatch(
//       setUser({
//         uid: fbUser.uid,
//         displayName: userData.name || fbUser.displayName || "",
//         email: fbUser.email,
//         photoURL: userData.photoURL || fbUser.photoURL || "",
//         status: userData.status || "",
//       })
//     );
//   } else {
//     store.dispatch(clearUser());
//   }
// });

// ReactDOM.createRoot(document.getElementById("root")).render(
//   <React.StrictMode>
//     <Provider store={store}>
//       <App />
//     </Provider>
//   </React.StrictMode>
// );


//Version4: Claude attempt 2 to fix messages color:

// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { Provider } from "react-redux";
import { store } from "./redux/store";

import { auth, db } from "./firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { setUser, clearUser } from "./redux/userSlice";

// Listen to firebase auth state and populate redux user with firestore info
// Clear any stale state first
store.dispatch(clearUser());

onAuthStateChanged(auth, async (fbUser) => {
  if (fbUser) {
    try {
      // Load user doc from firestore
      const userDocRef = doc(db, "users", fbUser.uid);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      
      // Dispatch to Redux with the current authenticated user
      store.dispatch(
        setUser({
          uid: fbUser.uid,
          displayName: userData.name || fbUser.displayName || "",
          email: fbUser.email,
          photoURL: userData.photoURL || fbUser.photoURL || "",
          status: userData.status || "",
        })
      );
    } catch (e) {
      console.error("Error loading user data:", e);
      // Still set basic user info even if Firestore fails
      store.dispatch(
        setUser({
          uid: fbUser.uid,
          displayName: fbUser.displayName || "",
          email: fbUser.email,
          photoURL: fbUser.photoURL || "",
          status: "",
        })
      );
    }
  } else {
    store.dispatch(clearUser());
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);


