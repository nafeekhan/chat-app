

//Version5: Friendship:

// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { Provider } from "react-redux";
import { store } from "./redux/store";

import { auth, db } from "./firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { setUser, clearUser } from "./redux/userSlice";
import {
  setFriends,
  setPendingRequests,
  setSentRequests,
} from "./redux/friendshipSlice";

// Listen to firebase auth state and populate redux user with firestore info
// Clear any stale state first
store.dispatch(clearUser());
store.dispatch(setFriends([]));
store.dispatch(setPendingRequests([]));
store.dispatch(setSentRequests([]));

let unsubscribeFriendship = null;

onAuthStateChanged(auth, async (fbUser) => {
  if (unsubscribeFriendship) {
    unsubscribeFriendship();
    unsubscribeFriendship = null;
  }
  if (fbUser) {
    try {
      // Load user doc from firestore
      const userDocRef = doc(db, "users", fbUser.uid);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      const defaultPrivacy = {
        wall: "friends",
        chat: "anyone",
        gallery: "friends",
      };

      // Dispatch to Redux with the current authenticated user
      store.dispatch(
        setUser({
          uid: fbUser.uid,
          displayName: userData.name || fbUser.displayName || "",
          email: fbUser.email,
          photoURL: userData.photoURL || fbUser.photoURL || "",
          status: userData.status || "",
          bio: userData.bio || "",
          privacy: {
            wall: userData.privacy?.wall || defaultPrivacy.wall,
            chat: userData.privacy?.chat || defaultPrivacy.chat,
            gallery: userData.privacy?.gallery || defaultPrivacy.gallery,
          },
          emailVerified: fbUser.emailVerified,
        })
      );

      const friendshipDocRef = doc(db, "friendships", fbUser.uid);
      unsubscribeFriendship = onSnapshot(
        friendshipDocRef,
        (snap) => {
          if (snap.exists()) {
            const friendshipData = snap.data();
            store.dispatch(setFriends(friendshipData.friends || []));
            store.dispatch(setPendingRequests(friendshipData.pendingRequests || []));
            store.dispatch(setSentRequests(friendshipData.sentRequests || []));
          } else {
            store.dispatch(setFriends([]));
            store.dispatch(setPendingRequests([]));
            store.dispatch(setSentRequests([]));
          }
        },
        (err) => {
          console.error("Error listening to friendship updates:", err);
        }
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
          bio: "",
          privacy: {
            wall: "friends",
            chat: "anyone",
            gallery: "friends",
          },
          emailVerified: fbUser.emailVerified,
        })
      );
    }
  } else {
    store.dispatch(clearUser());
    store.dispatch(setFriends([]));
    store.dispatch(setPendingRequests([]));
    store.dispatch(setSentRequests([]));
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
