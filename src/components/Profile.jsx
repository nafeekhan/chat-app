

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { db, storage, auth } from "../firebase/config";
import { updateUser } from "../redux/userSlice";
import { addSentRequest, removeFriend } from "../redux/friendshipSlice";

const defaultPrivacy = {
  wall: "friends",
  chat: "anyone",
  gallery: "friends",
};

export default function Profile() {
  const params = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const me = useSelector((s) => s.user.user);
  const friends = useSelector((s) => s.friendship.friends);
  const sentRequests = useSelector((s) => s.friendship.sentRequests);

  const viewingUid = params.uid;
  const isOwn = !viewingUid || viewingUid === me?.uid;
  const profileUid = isOwn ? me?.uid : viewingUid;

  const [profile, setProfile] = useState(null);
  const [file, setFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  const [wallPosts, setWallPosts] = useState([]);
  const [wallLoading, setWallLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [wallMessage, setWallMessage] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingContent, setEditingContent] = useState("");

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!profileUid) return;
      try {
        const docRef = doc(db, "users", profileUid);
        const snap = await getDoc(docRef);
        if (ignore) return;
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            uid: profileUid,
            name: data.name || "",
            email: data.email || "",
            status: data.status || "",
            bio: data.bio || "",
            photoURL: data.photoURL || "",
            privacy: {
              wall: data.privacy?.wall || defaultPrivacy.wall,
              chat: data.privacy?.chat || defaultPrivacy.chat,
              gallery: data.privacy?.gallery || defaultPrivacy.gallery,
            },
          });
        } else if (isOwn && me) {
          setProfile({
            uid: me.uid,
            name: me.displayName || "",
            email: me.email || "",
            status: me.status || "",
            bio: me.bio || "",
            photoURL: me.photoURL || "",
            privacy: {
              wall: me.privacy?.wall || defaultPrivacy.wall,
              chat: me.privacy?.chat || defaultPrivacy.chat,
              gallery: me.privacy?.gallery || defaultPrivacy.gallery,
            },
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [profileUid, isOwn, me]);

  useEffect(() => {
    if (!profileUid) return;
    setWallLoading(true);
    const q = query(
      collection(db, "wallPosts"),
      where("ownerId", "==", profileUid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          };
        });
        setWallPosts(items);
        setWallLoading(false);
      },
      (err) => {
        console.error("Error loading wall posts:", err);
        setWallPosts([]);
        setWallLoading(false);
      }
    );

    return () => unsub();
  }, [profileUid]);

  const isFriend = useMemo(() => {
    if (!profile || !friends) return false;
    return friends.includes(profile.uid);
  }, [friends, profile]);

  const canPostOnWall = useMemo(() => {
    if (!profile || !me) return false;
    if (isOwn) return true;

    switch (profile.privacy?.wall) {
      case "anyone":
        return true;
      case "friends":
        return isFriend;
      case "only me":
      default:
        return false;
    }
  }, [profile, me, isOwn, isFriend]);

  const canViewGallery = useMemo(() => {
    if (!profile || isOwn) return true;
    switch (profile.privacy?.gallery) {
      case "anyone":
        return true;
      case "friends":
        return isFriend;
      case "only me":
      default:
        return false;
    }
  }, [profile, isOwn, isFriend]);

  const handleProfileSave = async () => {
    if (!me || !profile || !isOwn) return;
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      let photoURL = profile.photoURL || "";
      if (file) {
        const uniqueName = `${Date.now()}_${file.name}`;
        const fileRef = ref(storage, `profilePics/${me.uid}/${uniqueName}`);
        await uploadBytes(fileRef, file);
        photoURL = await getDownloadURL(fileRef);
      }

      await setDoc(
        doc(db, "users", me.uid),
        {
          name: profile.name,
          status: profile.status,
          bio: profile.bio,
          photoURL,
        },
        { merge: true }
      );

      if (auth.currentUser) {
        await updateAuthProfile(auth.currentUser, {
          displayName: profile.name,
          photoURL,
        });
      }

      dispatch(
        updateUser({
          displayName: profile.name,
          status: profile.status,
          bio: profile.bio,
          photoURL,
        })
      );

      setProfile((prev) => (prev ? { ...prev, photoURL } : prev));
      setProfileMessage({ type: "success", text: "Profile updated." });
      setFile(null);
    } catch (err) {
      console.error("Error saving profile:", err);
      setProfileMessage({
        type: "error",
        text: err.message || "Unable to save profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!me || !profile || isOwn) return;
    try {
      await setDoc(
        doc(db, "friendships", me.uid),
        {
          sentRequests: arrayUnion(profile.uid),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "friendships", profile.uid),
        {
          pendingRequests: arrayUnion(me.uid),
        },
        { merge: true }
      );

      dispatch(addSentRequest(profile.uid));
    } catch (err) {
      console.error("Error sending friend request:", err);
      alert("Error sending friend request");
    }
  };

  const removeFriendConnection = async () => {
    if (!me || !profile || isOwn) return;
    try {
      await setDoc(
        doc(db, "friendships", me.uid),
        {
          friends: arrayRemove(profile.uid),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, "friendships", profile.uid),
        {
          friends: arrayRemove(me.uid),
        },
        { merge: true }
      );
      dispatch(removeFriend(profile.uid));
    } catch (err) {
      console.error("Error removing friend:", err);
      alert("Error removing friend");
    }
  };

  const handleCreatePost = async () => {
    if (!me || !profile) return;
    if (!newPost.trim()) return;
    if (!canPostOnWall) {
      setWallMessage({
        type: "error",
        text: "You do not have permission to post on this wall.",
      });
      return;
    }

    try {
      await addDoc(collection(db, "wallPosts"), {
        ownerId: profile.uid,
        authorId: me.uid,
        authorName: me.displayName || me.email || "Anonymous",
        content: newPost.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewPost("");
      setWallMessage({ type: "success", text: "Post added to wall." });
    } catch (err) {
      console.error("Error creating wall post:", err);
      setWallMessage({
        type: "error",
        text: err.message || "Unable to add post.",
      });
    }
  };

  const startEditingPost = (post) => {
    setEditingPostId(post.id);
    setEditingContent(post.content);
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditingContent("");
  };

  const handleUpdatePost = async () => {
    if (!editingPostId) return;
    if (!editingContent.trim()) {
      setWallMessage({ type: "error", text: "Post content cannot be empty." });
      return;
    }
    try {
      await updateDoc(doc(db, "wallPosts", editingPostId), {
        content: editingContent.trim(),
        updatedAt: serverTimestamp(),
      });
      setWallMessage({ type: "success", text: "Post updated." });
      cancelEditing();
    } catch (err) {
      console.error("Error updating wall post:", err);
      setWallMessage({
        type: "error",
        text: err.message || "Unable to update post.",
      });
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await deleteDoc(doc(db, "wallPosts", postId));
      setWallMessage({ type: "success", text: "Post deleted." });
    } catch (err) {
      console.error("Error deleting wall post:", err);
      setWallMessage({
        type: "error",
        text: err.message || "Unable to delete post.",
      });
    }
  };

  if (!profile || !profile.uid) {
    return <div className="p-6 text-gray-600">Loading profile...</div>;
  }

  const isRequestSent = sentRequests.includes(profile.uid);
  const canEditPost = (post) => me && post.authorId === me.uid;
  const canDeletePost = (post) => {
    if (!me) return false;
    if (post.authorId === me.uid) return true;
    return isOwn;
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-white rounded shadow p-6 flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center gap-3 md:w-1/3">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt="avatar"
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-300 rounded-full" />
            )}
            {isOwn && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <button
                  onClick={() => navigate(`/gallery/${profile.uid}?select=profile`)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Choose from gallery
                </button>
              </>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div className="grid gap-3">
              <label className="block">
                <span className="text-sm text-gray-600">Name</span>
                <input
                  value={profile.name}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev
                    )
                  }
                  className={`w-full border rounded p-2 ${
                    isOwn ? "" : "bg-gray-100"
                  }`}
                  readOnly={!isOwn}
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">Email</span>
                <input
                  value={profile.email}
                  readOnly
                  className="w-full border rounded p-2 bg-gray-100 cursor-not-allowed"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">Status</span>
                <input
                  value={profile.status}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, status: e.target.value } : prev
                    )
                  }
                  className={`w-full border rounded p-2 ${
                    isOwn ? "" : "bg-gray-100"
                  }`}
                  readOnly={!isOwn}
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">Bio</span>
                <textarea
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, bio: e.target.value } : prev
                    )
                  }
                  className={`w-full border rounded p-2 h-24 resize-none ${
                    isOwn ? "" : "bg-gray-100"
                  }`}
                  readOnly={!isOwn}
                />
              </label>
            </div>

            {isOwn ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleProfileSave}
                  disabled={savingProfile}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
                {profileMessage && (
                  <span
                    className={`text-sm ${
                      profileMessage.type === "error"
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {profileMessage.text}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  {profile.privacy?.wall === "only me"
                    ? "Wall posts disabled for visitors."
                    : profile.privacy?.wall === "friends"
                    ? "Friends can post on wall."
                    : "Anyone can post on wall."}
                </div>
                <button
                  onClick={() => {
                    if (friends.includes(profile.uid)) {
                      removeFriendConnection();
                    } else if (!isRequestSent) {
                      sendFriendRequest();
                    }
                  }}
                  disabled={isRequestSent && !friends.includes(profile.uid)}
                  className={`px-4 py-2 rounded ${
                    friends.includes(profile.uid)
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : isRequestSent
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {friends.includes(profile.uid)
                    ? "Remove Friend"
                    : isRequestSent
                    ? "Request Sent"
                    : "Add Friend"}
                </button>
              </div>
            )}

            <button
              onClick={() => navigate(`/gallery/${profile.uid}`)}
              disabled={!canViewGallery}
              title={
                canViewGallery
                  ? "Open gallery"
                  : "Gallery is restricted by privacy settings."
              }
              className={`px-4 py-2 rounded border ${
                canViewGallery
                  ? "border-blue-600 text-blue-600 hover:bg-blue-50"
                  : "border-gray-300 text-gray-400 cursor-not-allowed"
              }`}
            >
              View Gallery
            </button>
          </div>
        </div>

        <div className="bg-white rounded shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Wall</h3>

          {canPostOnWall ? (
            <div className="mb-6 space-y-3">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="w-full border rounded p-3 h-24 resize-none"
                placeholder="Share something..."
              />
              <button
                onClick={handleCreatePost}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Post
              </button>
            </div>
          ) : (
            <div className="mb-6 text-gray-500">
              You do not have permission to post on this wall.
            </div>
          )}

          {wallMessage && (
            <div
              className={`mb-4 text-sm ${
                wallMessage.type === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {wallMessage.text}
            </div>
          )}

          {wallLoading ? (
            <div className="text-gray-500">Loading wall posts...</div>
          ) : wallPosts.length === 0 ? (
            <div className="text-gray-500">No posts yet.</div>
          ) : (
            <ul className="space-y-4">
              {wallPosts.map((post) => (
                <li key={post.id} className="border rounded p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">
                        {post.authorName || post.authorId}
                      </div>
                      <div className="text-xs text-gray-500">
                        {post.createdAt
                          ? post.createdAt.toLocaleString()
                          : "Just now"}
                        {post.updatedAt &&
                        post.updatedAt instanceof Date &&
                        post.createdAt &&
                        post.updatedAt.getTime() !== post.createdAt.getTime()
                          ? " · edited"
                          : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canEditPost(post) && (
                        <button
                          onClick={() => startEditingPost(post)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {canDeletePost(post) && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {editingPostId === post.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full border rounded p-2 h-20 resize-none"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleUpdatePost}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1 border rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
