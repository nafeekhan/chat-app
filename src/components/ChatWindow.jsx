import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  where,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

export default function ChatWindow() {
  const { chatId } = useParams();
  const navigate = useNavigate();

  const user = useSelector((state) => state.user.user);
  const currentUserId = user?.uid;

  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [text, setText] = useState("");

  const [chatList, setChatList] = useState([]);
  const [chatListLoading, setChatListLoading] = useState(true);

  const scrollRef = useRef(null);

  // Load user's chats for sidebar navigation
  useEffect(() => {
    if (!currentUserId) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUserId)
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const chats = await Promise.all(
          snap.docs.map(async (chatDoc) => {
            const data = chatDoc.data();
            const otherUid = (data.participants || []).find(
              (uid) => uid !== currentUserId
            );
            let otherName = "Unknown";
            let photoURL = "";

            if (otherUid) {
              try {
                const otherSnap = await getDoc(doc(db, "users", otherUid));
                if (otherSnap.exists()) {
                  const otherData = otherSnap.data();
                  otherName = otherData.name || otherData.email || otherUid;
                  photoURL = otherData.photoURL || "";
                }
              } catch (err) {
                console.error("Error fetching chat participant:", err);
              }
            }

            const updatedAt = data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : data.updatedAt instanceof Date
              ? data.updatedAt
              : data.createdAt?.toDate
              ? data.createdAt.toDate()
              : data.createdAt instanceof Date
              ? data.createdAt
              : null;

            return {
              id: chatDoc.id,
              otherUid,
              otherName,
              photoURL,
              updatedAt,
            };
          })
        );

        chats.sort((a, b) => {
          const aTime = a.updatedAt ? a.updatedAt.getTime() : 0;
          const bTime = b.updatedAt ? b.updatedAt.getTime() : 0;
          return bTime - aTime;
        });

        setChatList(chats);
        setChatListLoading(false);
      },
      (err) => {
        console.error("Error loading chats:", err);
        setChatList([]);
        setChatListLoading(false);
      }
    );

    return () => unsub();
  }, [currentUserId]);

  // Load messages and other participant info for current chat
  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const parts = chatId.split("_");
    const otherUid =
      parts[0] === currentUserId ? parts[1] : parts[0] || currentUserId;

    const fetchOther = async () => {
      try {
        const snap = await getDoc(doc(db, "users", otherUid));
        if (snap.exists()) {
          setOtherUser({ uid: otherUid, ...snap.data() });
        } else {
          setOtherUser({ uid: otherUid });
        }
      } catch (err) {
        console.error("Error loading other user:", err);
        setOtherUser({ uid: otherUid });
      }
    };
    fetchOther();

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const ms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(ms);
        setTimeout(
          () => scrollRef.current?.scrollIntoView({ behavior: "smooth" }),
          50
        );
      },
      (err) => {
        console.error("Error loading messages:", err);
      }
    );

    return () => unsub();
  }, [chatId, currentUserId]);

  const sendMessage = async () => {
    if (!text.trim() || !currentUserId || !chatId) return;
    const trimmed = text.trim();
    setText("");

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUserId,
        text: trimmed,
        timestamp: serverTimestamp(),
      });
      await setDoc(
        doc(db, "chats", chatId),
        {
          updatedAt: serverTimestamp(),
          lastMessage: trimmed,
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const activeChat = chatList.find((c) => c.id === chatId);

  return (
    <div className="h-[calc(100vh-64px)] flex">
      <aside className="w-72 bg-gray-100 border-r flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Chats</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatListLoading ? (
            <div className="p-4 text-gray-500">Loading chats...</div>
          ) : chatList.length === 0 ? (
            <div className="p-4 text-gray-500">
              No chats yet. Start one from the Users page.
            </div>
          ) : (
            <ul className="divide-y">
              {chatList.map((chat) => (
                <li
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-200 ${
                    chat.id === chatId ? "bg-gray-300" : ""
                  }`}
                >
                  {chat.photoURL ? (
                    <img
                      src={chat.photoURL}
                      alt={chat.otherName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-400 rounded-full" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{chat.otherName}</div>
                    {chat.updatedAt && (
                      <div className="text-xs text-gray-500">
                        {chat.updatedAt.toLocaleString()}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {otherUser && (
          <div className="border-t p-4 space-y-2 bg-white">
            <div className="text-sm font-semibold">Chatting with</div>
            <div className="flex items-center gap-3">
              {otherUser.photoURL ? (
                <img
                  src={otherUser.photoURL}
                  alt={otherUser.name || otherUser.uid}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-300 rounded-full" />
              )}
              <div>
                <div className="font-medium">
                  {otherUser.name || otherUser.email || otherUser.uid}
                </div>
                {otherUser.status && (
                  <div className="text-xs text-gray-500">
                    {otherUser.status}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <div>
            <div className="text-lg font-semibold">
              {activeChat?.otherName || "Select a chat"}
            </div>
            {otherUser?.email && (
              <div className="text-sm text-gray-500">{otherUser.email}</div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="flex flex-col gap-3">
            {currentUserId ? (
              messages.map((message) => {
                const isMe = message.senderId === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`max-w-md p-3 rounded break-words ${
                      isMe
                        ? "self-end bg-blue-600 text-white"
                        : "self-start bg-gray-300 text-black"
                    }`}
                  >
                    <div className="text-xs mb-1 opacity-80">
                      {isMe ? "You" : otherUser?.name || message.senderId}
                    </div>
                    <div>{message.text}</div>
                  </div>
                );
              })
            ) : (
              <div className="text-gray-500">Login to view chat.</div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="p-4 border-t bg-white flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border p-2 rounded"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}

