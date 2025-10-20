// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import friendshipReducer from "./friendshipSlice";


export const store = configureStore({
  reducer: {
    user: userReducer,
    friendship: friendshipReducer,
  },
});
