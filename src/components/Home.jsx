

//Version5: Friends:

// src/components/Home.jsx
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
//import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayAccept, arrayRemove } from "firebase/firestore";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase/config";
import { Link, useNavigate } from "react-router-dom";
import { addFriend, removePendingRequest } from "../redux/friendshipSlice";

export default function Home() {
  const user = useSelector((s) => s.user.user);
  const friends = useSelector((s) => s.friendship.friends);
  const pendingRequests = useSelector((s) => s.friendship.pendingRequests);
  const [chats, setChats] = useState([]);
  const [friendData, setFriendData] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;

    // realtime fetch chats where participants contains current uid
    const q = query(collection(db, "chats"));
    const unsub = onSnapshot(q, async (snap) => {
      const chatDocs = [];
      for (const d of snap.docs) {
        const data = d.data();
        if (Array.isArray(data.participants) && data.participants.includes(user.uid)) {
          // derive display name of the other participant
          const otherUid = data.participants.find((p) => p !== user.uid);
          let otherName = otherUid;
          try {
            const userDoc = await getDoc(doc(db, "users", otherUid));
            if (userDoc.exists()) otherName = userDoc.data().name || otherName;
          } catch (e) { }
          chatDocs.push({
            id: d.id,
            ...data,
            otherUid,
            otherName,
          });
        }
      }
      setChats(chatDocs);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || friends.length === 0) {
      setFriendData([]);
      return;
    }

    // Fetch data for all friends
    const fetchFriendsData = async () => {
      const friendsData = [];
      for (const friendUid of friends) {
        try {
          const userDoc = await getDoc(doc(db, "users", friendUid));
          if (userDoc.exists()) {
            friendsData.push({
              uid: friendUid,
              ...userDoc.data(),
            });
          }
        } catch (e) {
          console.error("Error fetching friend data:", e);
        }
      }
      setFriendData(friendsData);
    };

    fetchFriendsData();
  }, [user, friends]);

  if (!user) return null;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-center gap-4 mb-6">
          {user.photoURL ? (
            <img src={user.photoURL} alt="me" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 bg-gray-300 rounded-full" />
          )}
          <div>
            <h2 className="text-2xl font-semibold">{user.displayName || "(No name)"}</h2>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-gray-500 mt-1">{user.status || "Hey there!"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Chats Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Your Chats</h3>
            {chats.length ? (
              <ul className="space-y-2">
                {chats.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/chat/${c.id}`)}
                  >
                    <div>
                      <div className="font-medium">{c.otherName}</div>
                      <div className="text-sm text-gray-500">Chat ID: {c.id}</div>
                    </div>
                    <div className="text-sm text-gray-400">Open</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No chats yet. Go to <Link to="/users" className="text-blue-600">Users</Link> to start one.</p>
            )}
          </div>

          {/* Friends Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Your Friends</h3>
            {friendData.length ? (
              <ul className="space-y-2">
                {friendData.map((f) => (
                  <li key={f.uid} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      {f.photoURL ? (
                        <img src={f.photoURL} alt={f.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{f.name || "(no name)"}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/profile/${f.uid}`)}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No friends yet. Go to <Link to="/users" className="text-blue-600">Users</Link> to add friends.</p>
            )}
          </div>
        </div>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-3">Friend Requests</h3>
            <ul className="space-y-2">
              {pendingRequests.map((requesterUid) => (
                <PendingRequestItem
                  key={requesterUid}
                  requesterUid={requesterUid}
                  currentUserId={user.uid}
                  onAccepted={() => {
                    dispatch(addFriend(requesterUid));
                    dispatch(removePendingRequest(requesterUid));
                  }}
                  onRejected={() => {
                    dispatch(removePendingRequest(requesterUid));
                  }}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingRequestItem({ requesterUid, currentUserId, onAccepted, onRejected }) {
  const [requester, setRequester] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", requesterUid));
        if (snap.exists()) {
          setRequester({ uid: requesterUid, ...snap.data() });
        }
      } catch (e) {
        console.error("Error fetching requester data:", e);
      }
    })();
  }, [requesterUid]);

  // const acceptRequest = async () => {
  //   try {
  //     // Add to both friends lists
  //     await updateDoc(doc(db, "friendships", currentUserId), {
  //       friends: arrayUnion(requesterUid),
  //       pendingRequests: arrayRemove(requesterUid),
  //     });

  //     await updateDoc(doc(db, "friendships", requesterUid), {
  //       friends: arrayUnion(currentUserId),
  //       sentRequests: arrayRemove(currentUserId),
  //     });
  //   } catch (e) {
  //     console.error("Error accepting request:", e);
  //     alert("Error accepting request");
  //   }
  // };

  const acceptRequest = async () => {
    try {
      // Add to both friends lists
      await setDoc(doc(db, "friendships", currentUserId), {
        friends: arrayUnion(requesterUid),
        pendingRequests: arrayRemove(requesterUid),
      }, { merge: true });

      await setDoc(doc(db, "friendships", requesterUid), {
        friends: arrayUnion(currentUserId),
        sentRequests: arrayRemove(currentUserId),
      }, { merge: true });
      if (typeof onAccepted === "function") {
        onAccepted();
      }
    } catch (e) {
      console.error("Error accepting request:", e);
      alert("Error accepting request");
    }
  };

  // const rejectRequest = async () => {
  //   try {
  //     await updateDoc(doc(db, "friendships", currentUserId), {
  //       pendingRequests: arrayRemove(requesterUid),
  //     });

  //     await updateDoc(doc(db, "friendships", requesterUid), {
  //       sentRequests: arrayRemove(currentUserId),
  //     });
  //   } catch (e) {
  //     console.error("Error rejecting request:", e);
  //     alert("Error rejecting request");
  //   }
  // };

  const rejectRequest = async () => {
    try {
      await setDoc(doc(db, "friendships", currentUserId), {
        pendingRequests: arrayRemove(requesterUid),
      }, { merge: true });

      await setDoc(doc(db, "friendships", requesterUid), {
        sentRequests: arrayRemove(currentUserId),
      }, { merge: true });
      if (typeof onRejected === "function") {
        onRejected();
      }
    } catch (e) {
      console.error("Error rejecting request:", e);
      alert("Error rejecting request");
    }
  };

  if (!requester) return null;

  return (
    <li className="flex items-center justify-between p-3 border rounded">
      <div className="flex items-center gap-2">
        {requester.photoURL ? (
          <img src={requester.photoURL} alt={requester.name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 bg-gray-300 rounded-full" />
        )}
        <div>
          <div className="font-medium text-sm">{requester.name || "(no name)"}</div>
          <div className="text-xs text-gray-500">{requester.email}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={acceptRequest}
          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          Accept
        </button>
        <button
          onClick={rejectRequest}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reject
        </button>
      </div>
    </li>
  );
}


