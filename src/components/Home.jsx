

// src/components/Home.jsx
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const user = useSelector((s) => s.user.user);
  const [chats, setChats] = useState([]);
  const navigate = useNavigate();

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
          } catch (e) {}
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

  if (!user) return null;

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
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
          <p>No chats yet. Go to <Link to="/users" className="text-blue-600">Users</Link> to start one.</p>
        )}
      </div>
    </div>
  );
}




