import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  friends: [], // array of UIDs of current friends
  pendingRequests: [], // array of UIDs of pending incoming requests
  sentRequests: [], // array of UIDs of sent outgoing requests
};

const friendshipSlice = createSlice({
  name: "friendship",
  initialState,
  reducers: {
    setFriends(state, action) {
      state.friends = action.payload;
    },
    setPendingRequests(state, action) {
      state.pendingRequests = action.payload;
    },
    setSentRequests(state, action) {
      state.sentRequests = action.payload;
    },
    addFriend(state, action) {
      if (!state.friends.includes(action.payload)) {
        state.friends.push(action.payload);
      }
    },
    removeFriend(state, action) {
      state.friends = state.friends.filter((uid) => uid !== action.payload);
    },
    addPendingRequest(state, action) {
      if (!state.pendingRequests.includes(action.payload)) {
        state.pendingRequests.push(action.payload);
      }
    },
    removePendingRequest(state, action) {
      state.pendingRequests = state.pendingRequests.filter(
        (uid) => uid !== action.payload
      );
    },
    addSentRequest(state, action) {
      if (!state.sentRequests.includes(action.payload)) {
        state.sentRequests.push(action.payload);
      }
    },
    removeSentRequest(state, action) {
      state.sentRequests = state.sentRequests.filter(
        (uid) => uid !== action.payload
      );
    },
  },
});

export const {
  setFriends,
  setPendingRequests,
  setSentRequests,
  addFriend,
  removeFriend,
  addPendingRequest,
  removePendingRequest,
  addSentRequest,
  removeSentRequest,
} = friendshipSlice.actions;
export default friendshipSlice.reducer;