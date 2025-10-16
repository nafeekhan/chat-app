

// src/components/UserList.jsx
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const me = useSelector((s) => s.user.user);
  const navigate = useNavigate();

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
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

//Friendlist:




