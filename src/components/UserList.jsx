

//Version5: Friends:

// src/components/UserList.jsx
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase/config";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addSentRequest, removeSentRequest, addFriend, removeFriend } from "../redux/friendshipSlice";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const me = useSelector((s) => s.user.user);
  const friends = useSelector((s) => s.friendship.friends);
  const sentRequests = useSelector((s) => s.friendship.sentRequests);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(
        snap.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .filter((u) => u.uid !== (me ? me.uid : null))
      );
    });

    return () => unsub();
  }, [me]);

  const startOrOpenChat = async (other) => {
    if (!me) return;
    // canonical chatId using lexicographic order
    const chatId = me.uid > other.uid ? `${me.uid}_${other.uid}` : `${other.uid}_${me.uid}`;
    const chatDocRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatDocRef);
    if (!chatSnap.exists()) {
      // create chat doc
      await setDoc(chatDocRef, {
        participants: [me.uid, other.uid],
        createdAt: new Date(),
      });
    }
    navigate(`/chat/${chatId}`);
  };

  // const sendFriendRequest = async (otherUid) => {
  //   if (!me) return;
  //   try {
  //     // Update sender's sentRequests
  //     const meFriendshipRef = doc(db, "friendships", me.uid);
  //     await updateDoc(meFriendshipRef, {
  //       sentRequests: arrayUnion(otherUid),
  //     });

  //     // Update receiver's pendingRequests
  //     const otherFriendshipRef = doc(db, "friendships", otherUid);
  //     await updateDoc(otherFriendshipRef, {
  //       pendingRequests: arrayUnion(me.uid),
  //     });

  //     dispatch(addSentRequest(otherUid));
  //   } catch (e) {
  //     console.error("Error sending friend request:", e);
  //     alert("Error sending friend request");
  //   }
  // };

  const sendFriendRequest = async (otherUid) => {
    if (!me) return;
    try {
      // Update sender's sentRequests
      const meFriendshipRef = doc(db, "friendships", me.uid);
      await setDoc(meFriendshipRef, {
        sentRequests: arrayUnion(otherUid),
      }, { merge: true });

      // Update receiver's pendingRequests
      const otherFriendshipRef = doc(db, "friendships", otherUid);
      await setDoc(otherFriendshipRef, {
        pendingRequests: arrayUnion(me.uid),
      }, { merge: true });

      dispatch(addSentRequest(otherUid));
    } catch (e) {
      console.error("Error sending friend request:", e);
      alert("Error sending friend request");
    }
  };

  // const removeFriendConnection = async (otherUid) => {
  //   if (!me) return;
  //   try {
  //     // Remove from both users' friends lists
  //     const meFriendshipRef = doc(db, "friendships", me.uid);
  //     await updateDoc(meFriendshipRef, {
  //       friends: arrayRemove(otherUid),
  //     });

  //     const otherFriendshipRef = doc(db, "friendships", otherUid);
  //     await updateDoc(otherFriendshipRef, {
  //       friends: arrayRemove(me.uid),
  //     });

  //     dispatch(removeFriend(otherUid));
  //   } catch (e) {
  //     console.error("Error removing friend:", e);
  //     alert("Error removing friend");
  //   }
  // };

  const removeFriendConnection = async (otherUid) => {
    if (!me) return;
    try {
      // Remove from both users' friends lists
      const meFriendshipRef = doc(db, "friendships", me.uid);
      await setDoc(meFriendshipRef, {
        friends: arrayRemove(otherUid),
      }, { merge: true });

      const otherFriendshipRef = doc(db, "friendships", otherUid);
      await setDoc(otherFriendshipRef, {
        friends: arrayRemove(me.uid),
      }, { merge: true });

      dispatch(removeFriend(otherUid));
    } catch (e) {
      console.error("Error removing friend:", e);
      alert("Error removing friend");
    }
  };

  const getFriendButtonText = (uid) => {
    if (friends.includes(uid)) return "Remove Friend";
    if (sentRequests.includes(uid)) return "Request Sent";
    return "Add Friend";
  };

  const handleFriendButton = async (uid) => {
    if (friends.includes(uid)) {
      await removeFriendConnection(uid);
    } else if (!sentRequests.includes(uid)) {
      await sendFriendRequest(uid);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">All Users</h2>
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.uid} className="flex items-center justify-between gap-4 p-3 border rounded">
              <div className="flex items-center gap-3">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="u" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gray-300 rounded-full" />
                )}
                <div>
                  <div className="font-medium">{u.name || "(no name)"}</div>
                  <div className="text-sm text-gray-500">{u.email}</div>
                  <div className="text-sm text-gray-400">{u.status}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/profile/${u.uid}`)}
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                >
                  View
                </button>
                <button
                  onClick={() => startOrOpenChat(u)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Chat
                </button>
                <button
                  onClick={() => handleFriendButton(u.uid)}
                  disabled={sentRequests.includes(u.uid) && !friends.includes(u.uid)}
                  className={`px-3 py-1 rounded ${friends.includes(u.uid)
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : sentRequests.includes(u.uid)
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                >
                  {getFriendButtonText(u.uid)}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}




