//Version1: Working code but messages from different user are same color:

// // src/components/ChatWindow.jsx
// import React, { useEffect, useState, useRef } from "react";
// import { useParams } from "react-router-dom";
// import { db, auth } from "../firebase/config";
// import { useSelector } from "react-redux";

// import {
//   collection,
//   addDoc,
//   query,
//   orderBy,
//   onSnapshot,
//   serverTimestamp,
//   doc,
//   getDoc,
// } from "firebase/firestore";

// export default function ChatWindow() {
//   const { chatId } = useParams(); // chatId must be like uid1_uid2 (we create this in UserList or when starting chat)
//   const [messages, setMessages] = useState([]);
//   const [otherUser, setOtherUser] = useState(null);
//   const [text, setText] = useState("");
//   const scrollRef = useRef(null);
//   //const me = auth.currentUser;
//   const [me, setMe] = useState(null);
// //   useEffect(() => {
// //     setMe(auth.currentUser);
// //   }, []);
//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       setMe(user);
//     });
//     return unsubscribe;
//   }, []);
//   //const reduxUser = useSelector((state) => state.user.user); // get logged-in user from Redux
//   const reduxUser = useSelector((state) => state.user.user);




//   useEffect(() => {
//     //if (!chatId) return;
//     if (!chatId || !me) return;

//     // determine other participant uid
//     const parts = chatId.split("_");
//     const otherUid = parts[0] === me.uid ? parts[1] : parts[0];

//     // load other user data
//     (async () => {
//       try {
//         const snap = await getDoc(doc(db, "users", otherUid));
//         if (snap.exists()) setOtherUser({ uid: otherUid, ...snap.data() });
//       } catch (e) {
//         setOtherUser({ uid: otherUid });
//       }
//     })();

//     const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
//     const unsub = onSnapshot(q, (snap) => {
//       const ms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//       setMessages(ms);
//       // scroll to bottom
//       setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
//     });

//     return () => unsub();
//   }, [chatId, me]);

//   const sendMessage = async () => {
//     if (!text.trim()) return;
//     await addDoc(collection(db, "chats", chatId, "messages"), {
//       senderId: me.uid,
//       text: text.trim(),
//       timestamp: serverTimestamp(),
//     });
//     setText("");
//   };

//   return (
//     <div className="h-[calc(100vh-64px)] flex">
//       {/* Left: optionally show other user's info */}
//       <div className="w-1/4 bg-gray-100 p-4 border-r">
//         <div>
//           <h3 className="font-semibold">Chat</h3>
//           {otherUser ? (
//             <div className="mt-4">
//               {otherUser.photoURL ? (
//                 <img src={otherUser.photoURL} alt="o" className="w-16 h-16 rounded-full object-cover" />
//               ) : (
//                 <div className="w-16 h-16 bg-gray-300 rounded-full" />
//               )}
//               <div className="mt-2 font-medium">{otherUser.name || "(no name)"}</div>
//               <div className="text-sm text-gray-500">{otherUser.status}</div>
//             </div>
//           ) : (
//             <div className="mt-4 text-gray-500">Loading user...</div>
//           )}
//         </div>
//       </div>

//       {/* Right: messages */}
//       <div className="flex-1 flex flex-col">
//         <div className="flex-1 overflow-y-auto p-4 bg-white">
//           <div className="flex flex-col gap-3">
//             {/*{messages.map((m) => (
//               <div
//                 key={m.id}
//                 className={`max-w-md p-2 rounded ${
//                   m.senderId === me.uid ? "self-end bg-blue-600 text-white" : "self-start bg-gray-200"
//                 }`}
//               >
//                 {m.text}
//               </div>
//             ))}*/}
//             {reduxUser ? (
//                 messages.map((m) => {
//                     //const isMe = me && m.senderId === me.uid;
//                     const isMe = reduxUser && m.senderId === reduxUser.uid;
//                     //const isMe = m.senderId === reduxUser.uid;

//                     return (
//                         <div
//                             key={m.id}
//                             className={`max-w-md p-2 rounded break-words ${
//                                 isMe
//                                     ? "self-end bg-blue-600 text-white"
//                                     : "self-start bg-gray-300 text-black"
//                             }`}
//                         >
//                             {m.text}
//                         </div>
//                     );
//                 })
//             ) : (
//                 <div>Loading chat...</div>
//             )}

//             <div ref={scrollRef} />
//           </div>
//         </div>

//         <div className="p-4 border-t flex gap-2">
//           <input
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             placeholder="Type a message..."
//             className="flex-1 border p-2 rounded"
//             onKeyDown={(e) => {
//               if (e.key === "Enter") sendMessage();
//             }}
//           />
//           <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded">
//             Send
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

//Version1 ends here.

//Version 2: attempted fix for different user messages color:
// src/components/ChatWindow.jsx
// import React, { useEffect, useState, useRef } from "react";
// import { useParams } from "react-router-dom";
// import { db, auth } from "../firebase/config";
// import { useSelector } from "react-redux";

// import {
//   collection,
//   addDoc,
//   query,
//   orderBy,
//   onSnapshot,
//   serverTimestamp,
//   doc,
//   getDoc,
// } from "firebase/firestore";

// export default function ChatWindow() {
//   const { chatId } = useParams(); // chatId must be like uid1_uid2
//   const [messages, setMessages] = useState([]);
//   const [otherUser, setOtherUser] = useState(null);
//   const [text, setText] = useState("");
//   const scrollRef = useRef(null);

//   const reduxUser = useSelector((state) => state.user.user);

//   // Load other user info
//   useEffect(() => {
//     if (!reduxUser || !chatId) return;

//     const parts = chatId.split("_");
//     const otherUid = parts[0] === reduxUser.uid ? parts[1] : parts[0];

//     (async () => {
//       try {
//         const snap = await getDoc(doc(db, "users", otherUid));
//         if (snap.exists()) setOtherUser({ uid: otherUid, ...snap.data() });
//         else setOtherUser({ uid: otherUid });
//       } catch (e) {
//         setOtherUser({ uid: otherUid });
//       }
//     })();
//   }, [chatId, reduxUser]);

//   // Subscribe to messages
//   useEffect(() => {
//     if (!reduxUser || !chatId) return;

//     const q = query(
//       collection(db, "chats", chatId, "messages"),
//       orderBy("timestamp", "asc")
//     );
//     const unsub = onSnapshot(q, (snap) => {
//       const ms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//       setMessages(ms);
//       setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
//     });

//     return () => unsub();
//   }, [chatId, reduxUser]);

//   const sendMessage = async () => {
//     if (!text.trim() || !reduxUser) return;
//     await addDoc(collection(db, "chats", chatId, "messages"), {
//       senderId: reduxUser.uid,
//       text: text.trim(),
//       timestamp: serverTimestamp(),
//     });
//     setText("");
//   };

//   return (
//     <div className="h-[calc(100vh-64px)] flex">
//       {/* Left: other user info */}
//       <div className="w-1/4 bg-gray-100 p-4 border-r">
//         <h3 className="font-semibold">Chat</h3>
//         {otherUser ? (
//           <div className="mt-4">
//             {otherUser.photoURL ? (
//               <img
//                 src={otherUser.photoURL}
//                 alt="o"
//                 className="w-16 h-16 rounded-full object-cover"
//               />
//             ) : (
//               <div className="w-16 h-16 bg-gray-300 rounded-full" />
//             )}
//             <div className="mt-2 font-medium">{otherUser.name || "(no name)"}</div>
//             <div className="text-sm text-gray-500">{otherUser.status}</div>
//           </div>
//         ) : (
//           <div className="mt-4 text-gray-500">Loading user...</div>
//         )}
//       </div>

//       {/* Right: messages */}
//       <div className="flex-1 flex flex-col">
//         <div className="flex-1 overflow-y-auto p-4 bg-white">
//           <div className="flex flex-col gap-3">
//             {reduxUser && messages.length > 0 ? (
//               messages.map((m) => {
//                 const isMe = String(m.senderId) === String(reduxUser.uid); // ensure string comparison
//                 return (
//                   <div
//                     key={m.id}
//                     className={`max-w-md p-2 rounded break-words ${
//                       isMe
//                         ? "self-end bg-blue-600 text-white"
//                         : "self-start bg-gray-300 text-black"
//                     }`}
//                   >
//                     <div className="text-xs text-gray-500 mb-1">
//                       {isMe ? "You" : m.senderId}
//                     </div>
//                     {m.text}
//                   </div>
//                 );
//               })
//             ) : (
//               <div>Loading chat...</div>
//             )}
//             <div ref={scrollRef} />
//           </div>
//         </div>

//         <div className="p-4 border-t flex gap-2">
//           <input
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             placeholder="Type a message..."
//             className="flex-1 border p-2 rounded"
//             onKeyDown={(e) => {
//               if (e.key === "Enter") sendMessage();
//             }}
//           />
//           <button
//             onClick={sendMessage}
//             className="bg-blue-600 text-white px-4 py-2 rounded"
//           >
//             Send
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }


//Version3: Claude attempt:

// import React, { useEffect, useState, useRef } from "react";
// import { useParams } from "react-router-dom";
// import { db, auth } from "../firebase/config";
// import { useSelector } from "react-redux";

// import {
//   collection,
//   addDoc,
//   query,
//   orderBy,
//   onSnapshot,
//   serverTimestamp,
//   doc,
//   getDoc,
// } from "firebase/firestore";

// export default function ChatWindow() {
//   const { chatId } = useParams(); // chatId must be like uid1_uid2
//   const [messages, setMessages] = useState([]);
//   const [otherUser, setOtherUser] = useState(null);
//   const [text, setText] = useState("");
//   const scrollRef = useRef(null);

//   const reduxUser = useSelector((state) => state.user.user);
//   const currentUserId = reduxUser?.uid; // Extract currentUserId for clarity

//   // Load other user info
//   useEffect(() => {
//     if (!currentUserId || !chatId) return;

//     const parts = chatId.split("_");
//     const otherUid = parts[0] === currentUserId ? parts[1] : parts[0];

//     (async () => {
//       try {
//         const snap = await getDoc(doc(db, "users", otherUid));
//         if (snap.exists()) setOtherUser({ uid: otherUid, ...snap.data() });
//         else setOtherUser({ uid: otherUid });
//       } catch (e) {
//         setOtherUser({ uid: otherUid });
//       }
//     })();
//   }, [chatId, currentUserId]);

//   // Subscribe to messages
//   useEffect(() => {
//     if (!currentUserId || !chatId) return;

//     const q = query(
//       collection(db, "chats", chatId, "messages"),
//       orderBy("timestamp", "asc")
//     );
//     const unsub = onSnapshot(q, (snap) => {
//       const ms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//       setMessages(ms);
//       setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
//     });

//     return () => unsub();
//   }, [chatId, currentUserId]);

//   const sendMessage = async () => {
//     if (!text.trim() || !currentUserId) return;
//     await addDoc(collection(db, "chats", chatId, "messages"), {
//       senderId: currentUserId,
//       text: text.trim(),
//       timestamp: serverTimestamp(),
//     });
//     setText("");
//   };

//   return (
//     <div className="h-[calc(100vh-64px)] flex">
//       {/* Left: other user info */}
//       <div className="w-1/4 bg-gray-100 p-4 border-r">
//         <h3 className="font-semibold">Chat</h3>
//         {otherUser ? (
//           <div className="mt-4">
//             {otherUser.photoURL ? (
//               <img
//                 src={otherUser.photoURL}
//                 alt="o"
//                 className="w-16 h-16 rounded-full object-cover"
//               />
//             ) : (
//               <div className="w-16 h-16 bg-gray-300 rounded-full" />
//             )}
//             <div className="mt-2 font-medium">{otherUser.name || "(no name)"}</div>
//             <div className="text-sm text-gray-500">{otherUser.status}</div>
//           </div>
//         ) : (
//           <div className="mt-4 text-gray-500">Loading user...</div>
//         )}
//       </div>

//       {/* Right: messages */}
//       <div className="flex-1 flex flex-col">
//         <div className="flex-1 overflow-y-auto p-4 bg-white">
//           <div className="flex flex-col gap-3">
//             {currentUserId && messages.length > 0 ? (
//               messages.map((m) => {
//                 const isMe = m.senderId === currentUserId;
//                 return (
//                   <div
//                     key={m.id}
//                     className={`max-w-md p-3 rounded break-words ${
//                       isMe
//                         ? "self-end bg-blue-600 text-white"
//                         : "self-start bg-gray-300 text-black"
//                     }`}
//                   >
//                     <div className="text-xs mb-1 font-semibold">
//                       {isMe ? "You" : otherUser?.name || "Other User"}
//                     </div>
//                     <div>{m.text}</div>
//                   </div>
//                 );
//               })
//             ) : (
//               <div className="text-gray-500">Loading chat...</div>
//             )}
//             <div ref={scrollRef} />
//           </div>
//         </div>

//         <div className="p-4 border-t flex gap-2">
//           <input
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             placeholder="Type a message..."
//             className="flex-1 border p-2 rounded"
//             onKeyDown={(e) => {
//               if (e.key === "Enter") sendMessage();
//             }}
//           />
//           <button
//             onClick={sendMessage}
//             className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
//           >
//             Send
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

//Version4: Claude attempt2 to fix message color:

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { db, auth } from "../firebase/config";
import { useSelector } from "react-redux";

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";

export default function ChatWindow() {
  const { chatId } = useParams(); // chatId must be like uid1_uid2
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  const reduxUser = useSelector((state) => state.user.user);
  // Use Firebase Auth directly as source of truth instead of Redux
  const currentUserId = auth.currentUser?.uid;

  // Load other user info
  useEffect(() => {
    if (!currentUserId || !chatId) return;

    const parts = chatId.split("_");
    const otherUid = parts[0] === currentUserId ? parts[1] : parts[0];

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", otherUid));
        if (snap.exists()) setOtherUser({ uid: otherUid, ...snap.data() });
        else setOtherUser({ uid: otherUid });
      } catch (e) {
        setOtherUser({ uid: otherUid });
      }
    })();
  }, [chatId, currentUserId]);

  // Subscribe to messages
  useEffect(() => {
    if (!currentUserId || !chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const ms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(ms);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    return () => unsub();
  }, [chatId, currentUserId]);

  const sendMessage = async () => {
    if (!text.trim() || !currentUserId) return;
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: currentUserId,
      text: text.trim(),
      timestamp: serverTimestamp(),
    });
    setText("");
  };

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Left: other user info */}
      <div className="w-1/4 bg-gray-100 p-4 border-r">
        <h3 className="font-semibold">Chat</h3>
        {otherUser ? (
          <div className="mt-4">
            {otherUser.photoURL ? (
              <img
                src={otherUser.photoURL}
                alt="o"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-300 rounded-full" />
            )}
            <div className="mt-2 font-medium">{otherUser.name || "(no name)"}</div>
            <div className="text-sm text-gray-500">{otherUser.status}</div>
          </div>
        ) : (
          <div className="mt-4 text-gray-500">Loading user...</div>
        )}
      </div>

      {/* Right: messages */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          <div className="flex flex-col gap-3">
            {currentUserId && messages.length > 0 ? (
              messages.map((m) => {
                const isMe = m.senderId === currentUserId;
                return (
                  <div
                    key={m.id}
                    className={`max-w-md p-3 rounded break-words ${
                      isMe
                        ? "self-end bg-blue-600 text-white"
                        : "self-start bg-gray-300 text-black"
                    }`}
                  >
                    <div className="text-xs mb-1 font-semibold">
                      {isMe ? "You" : otherUser?.name || "Other User"}
                    </div>
                    <div>{m.text}</div>
                  </div>
                );
              })
            ) : (
              <div className="text-gray-500">Loading chat...</div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border p-2 rounded"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

