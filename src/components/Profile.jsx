

//Version5: Friends:

// src/components/Profile.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { db, storage, auth } from "../firebase/config";
import { doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { updateUser } from "../redux/userSlice";
import { addSentRequest, removeSentRequest, addFriend, removeFriend } from "../redux/friendshipSlice";

export default function Profile() {
  const params = useParams(); // may have uid
  const me = useSelector((s) => s.user.user);
  const friends = useSelector((s) => s.friendship.friends);
  const sentRequests = useSelector((s) => s.friendship.sentRequests);
  const viewingUid = params.uid;
  const dispatch = useDispatch();

  const isOwn = !viewingUid || viewingUid === (me && me.uid);

  const [profile, setProfile] = useState({
    uid: "",
    name: "",
    email: "",
    status: "",
    photoURL: "",
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    const load = async () => {
      const uidToLoad = isOwn ? me.uid : viewingUid;
      if (!uidToLoad) return;
      const docRef = doc(db, "users", uidToLoad);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setProfile({ uid: uidToLoad, ...snap.data() });
      } else {
        // fallback to auth info if present for own user
        if (isOwn && me) {
          setProfile({
            uid: me.uid,
            name: me.displayName || "",
            email: me.email || "",
            status: me.status || "",
            photoURL: me.photoURL || "",
          });
        }
      }
    };
    load();
  }, [viewingUid, me, isOwn]);

  const handleSave = async () => {
    if (!me) return;
    let photoURL = profile.photoURL || "";
    if (file) {
      const fileRef = ref(storage, `profilePics/${me.uid}`);
      await uploadBytes(fileRef, file);
      photoURL = await getDownloadURL(fileRef);
    }

    // update firestore
    await updateDoc(doc(db, "users", me.uid), {
      name: profile.name,
      status: profile.status,
      photoURL,
    });

    // update firebase auth profile too
    await updateProfile(auth.currentUser, {
      displayName: profile.name,
      photoURL,
    });

    // update redux
    dispatch(updateUser({ displayName: profile.name, status: profile.status, photoURL }));

    alert("Profile updated");
  };

  // const sendFriendRequest = async () => {
  //   if (!me || !viewingUid) return;
  //   try {
  //     // Update sender's sentRequests
  //     const meFriendshipRef = doc(db, "friendships", me.uid);
  //     await updateDoc(meFriendshipRef, {
  //       sentRequests: arrayUnion(viewingUid),
  //     });

  //     // Update receiver's pendingRequests
  //     const otherFriendshipRef = doc(db, "friendships", viewingUid);
  //     await updateDoc(otherFriendshipRef, {
  //       pendingRequests: arrayUnion(me.uid),
  //     });

  //     dispatch(addSentRequest(viewingUid));
  //   } catch (e) {
  //     console.error("Error sending friend request:", e);
  //     alert("Error sending friend request");
  //   }
  // };

  const sendFriendRequest = async () => {
    if (!me || !viewingUid) return;
    try {
      // Update sender's sentRequests
      const meFriendshipRef = doc(db, "friendships", me.uid);
      await setDoc(meFriendshipRef, {
        sentRequests: arrayUnion(viewingUid),
      }, { merge: true });

      // Update receiver's pendingRequests
      const otherFriendshipRef = doc(db, "friendships", viewingUid);
      await setDoc(otherFriendshipRef, {
        pendingRequests: arrayUnion(me.uid),
      }, { merge: true });

      dispatch(addSentRequest(viewingUid));
    } catch (e) {
      console.error("Error sending friend request:", e);
      alert("Error sending friend request");
    }
  };

  // const removeFriendConnection = async () => {
  //   if (!me || !viewingUid) return;
  //   try {
  //     // Remove from both users' friends lists
  //     const meFriendshipRef = doc(db, "friendships", me.uid);
  //     await updateDoc(meFriendshipRef, {
  //       friends: arrayRemove(viewingUid),
  //     });

  //     const otherFriendshipRef = doc(db, "friendships", viewingUid);
  //     await updateDoc(otherFriendshipRef, {
  //       friends: arrayRemove(me.uid),
  //     });

  //     dispatch(removeFriend(viewingUid));
  //   } catch (e) {
  //     console.error("Error removing friend:", e);
  //     alert("Error removing friend");
  //   }
  // };

  const removeFriendConnection = async () => {
    if (!me || !viewingUid) return;
    try {
      // Remove from both users' friends lists
      const meFriendshipRef = doc(db, "friendships", me.uid);
      await setDoc(meFriendshipRef, {
        friends: arrayRemove(viewingUid),
      }, { merge: true });

      const otherFriendshipRef = doc(db, "friendships", viewingUid);
      await setDoc(otherFriendshipRef, {
        friends: arrayRemove(me.uid),
      }, { merge: true });

      dispatch(removeFriend(viewingUid));
    } catch (e) {
      console.error("Error removing friend:", e);
      alert("Error removing friend");
    }
  };

  if (!profile.uid) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="max-w-md mx-auto bg-white rounded shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">
          {isOwn ? "Edit Profile" : "View Profile"}
        </h2>

        <div className="flex flex-col items-center gap-3 mb-4">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="avatar" className="w-28 h-28 rounded-full object-cover" />
          ) : (
            <div className="w-28 h-28 bg-gray-300 rounded-full" />
          )}

          {isOwn && (
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          )}
        </div>

        <label className="block mb-2 text-sm">Name</label>
        <input
          value={profile.name}
          onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
          className="w-full border p-2 rounded mb-3"
          readOnly={!isOwn}
        />

        <label className="block mb-2 text-sm">Email</label>
        <input value={profile.email} readOnly className="w-full border p-2 rounded mb-3 bg-gray-50" />

        <label className="block mb-2 text-sm">Status</label>
        <input
          value={profile.status}
          onChange={(e) => setProfile((p) => ({ ...p, status: e.target.value }))}
          className="w-full border p-2 rounded mb-3"
          readOnly={!isOwn}
        />

        {isOwn ? (
          <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            Save
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-center text-gray-500 text-sm">This is a view-only profile.</div>
            <button
              onClick={() => {
                if (friends.includes(viewingUid)) {
                  removeFriendConnection();
                } else if (!sentRequests.includes(viewingUid)) {
                  sendFriendRequest();
                }
              }}
              disabled={sentRequests.includes(viewingUid) && !friends.includes(viewingUid)}
              className={`py-2 rounded font-medium ${friends.includes(viewingUid)
                ? "bg-red-600 text-white hover:bg-red-700"
                : sentRequests.includes(viewingUid)
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
                }`}
            >
              {friends.includes(viewingUid)
                ? "Remove Friend"
                : sentRequests.includes(viewingUid)
                  ? "Request Sent"
                  : "Add Friend"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


