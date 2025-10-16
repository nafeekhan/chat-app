

// src/components/Profile.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { db, storage, auth } from "../firebase/config";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { updateUser } from "../redux/userSlice";

export default function Profile() {
  const params = useParams(); // may have uid
  const me = useSelector((s) => s.user.user);
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
          <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded">
            Save
          </button>
        ) : (
          <div className="text-center text-gray-500">This is a view-only profile.</div>
        )}
      </div>
    </div>
  );
}


