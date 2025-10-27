import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  deleteDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { db, storage, auth } from "../firebase/config";
import { updateUser } from "../redux/userSlice";

const defaultPrivacy = {
  wall: "friends",
  chat: "anyone",
  gallery: "friends",
};

export default function Gallery() {
  const { uid: paramUid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const me = useSelector((s) => s.user.user);
  const friends = useSelector((s) => s.friendship.friends);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location]);
  const selectMode = queryParams.get("select") === "profile";

  const profileUid = paramUid || me?.uid;
  const isOwn = profileUid && me && profileUid === me.uid;

  const [ownerProfile, setOwnerProfile] = useState(null);
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let ignore = false;
    const loadProfile = async () => {
      if (!profileUid) return;
      try {
        const snap = await getDoc(doc(db, "users", profileUid));
        if (ignore) return;
        if (snap.exists()) {
          const data = snap.data();
          setOwnerProfile({
            uid: profileUid,
            name: data.name || "",
            privacy: {
              wall: data.privacy?.wall || defaultPrivacy.wall,
              chat: data.privacy?.chat || defaultPrivacy.chat,
              gallery: data.privacy?.gallery || defaultPrivacy.gallery,
            },
          });
        } else if (isOwn && me) {
          setOwnerProfile({
            uid: me.uid,
            name: me.displayName || "",
            privacy: {
              wall: me.privacy?.wall || defaultPrivacy.wall,
              chat: me.privacy?.chat || defaultPrivacy.chat,
              gallery: me.privacy?.gallery || defaultPrivacy.gallery,
            },
          });
        } else {
          setOwnerProfile({
            uid: profileUid,
            name: "Unknown user",
            privacy: defaultPrivacy,
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        if (!ignore) {
          setOwnerProfile({
            uid: profileUid,
            name: "Unknown user",
            privacy: defaultPrivacy,
          });
        }
      }
    };

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [profileUid, isOwn, me]);

  const isFriend = useMemo(() => {
    if (!profileUid || !friends) return false;
    return friends.includes(profileUid);
  }, [friends, profileUid]);

  const canViewGallery = useMemo(() => {
    if (!ownerProfile) return false;
    if (isOwn) return true;
    switch (ownerProfile.privacy?.gallery) {
      case "anyone":
        return true;
      case "friends":
        return isFriend;
      case "only me":
      default:
        return false;
    }
  }, [ownerProfile, isOwn, isFriend]);

  useEffect(() => {
    if (!profileUid || !ownerProfile) return;
    if (!canViewGallery) {
      setImages([]);
      setLoadingImages(false);
      return;
    }
    setLoadingImages(true);
    const q = query(
      collection(db, "galleryItems"),
      where("ownerId", "==", profileUid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          };
        });
        setImages(next);
        setLoadingImages(false);
      },
      (err) => {
        console.error("Error loading gallery:", err);
        setImages([]);
        setLoadingImages(false);
      }
    );

    return () => unsub();
  }, [profileUid, ownerProfile, canViewGallery]);

  const handleUpload = async (file) => {
    if (!isOwn || !file) return;
    setUploading(true);
    setMessage(null);
    try {
      const path = `galleries/${profileUid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "galleryItems"), {
        ownerId: profileUid,
        url,
        storagePath: path,
        createdAt: serverTimestamp(),
        deleted: false,
      });
      setMessage({ type: "success", text: "Image uploaded." });
    } catch (err) {
      console.error("Error uploading image:", err);
      setMessage({
        type: "error",
        text: err.message || "Unable to upload image.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (image) => {
    if (!isOwn) return;
    try {
      if (image.storagePath) {
        await deleteObject(ref(storage, image.storagePath));
      }
      await deleteDoc(doc(db, "galleryItems", image.id));
      setMessage({ type: "success", text: "Image removed from gallery." });
    } catch (err) {
      console.error("Error deleting image:", err);
      setMessage({
        type: "error",
        text: err.message || "Unable to delete image.",
      });
    }
  };

  const handleSetProfilePicture = async (image) => {
    if (!isOwn || !me) return;
    try {
      await setDoc(
        doc(db, "users", me.uid),
        { photoURL: image.url },
        { merge: true }
      );
      if (auth.currentUser) {
        await updateAuthProfile(auth.currentUser, { photoURL: image.url });
      }
      dispatch(updateUser({ photoURL: image.url }));
      setMessage({
        type: "success",
        text: "Profile picture updated.",
      });
      if (selectMode) {
        navigate("/profile");
      }
    } catch (err) {
      console.error("Error setting profile picture:", err);
      setMessage({
        type: "error",
        text: err.message || "Unable to update profile picture.",
      });
    }
  };

  if (!profileUid) {
    return <div className="p-6 text-gray-600">No gallery selected.</div>;
  }

  if (!ownerProfile) {
    return <div className="p-6 text-gray-600">Loading gallery...</div>;
  }

  const backPath = isOwn ? "/profile" : `/profile/${profileUid}`;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto bg-white rounded shadow p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-semibold">
              {isOwn ? "My Gallery" : `${ownerProfile.name || "Gallery"}`}
            </h2>
            {selectMode && (
              <p className="text-sm text-gray-500">
                Choose an image below to use as your profile picture.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(backPath)}
              className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
            >
              Back to Profile
            </button>
            {isOwn && (
              <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700">
                {uploading ? "Uploading..." : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                    e.target.value = "";
                  }}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        {!canViewGallery ? (
          <div className="text-gray-500">
            Gallery is not available due to privacy settings.
          </div>
        ) : loadingImages ? (
          <div className="text-gray-500">Loading images...</div>
        ) : images.length === 0 ? (
          <div className="text-gray-500">
            {isOwn
              ? "No images yet. Upload some photos to start your gallery."
              : "No images to display."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="border rounded overflow-hidden flex flex-col"
              >
                <img
                  src={image.url}
                  alt="Gallery item"
                  className="w-full h-48 object-cover"
                />
                <div className="p-3 space-y-2">
                  {image.createdAt && (
                    <div className="text-xs text-gray-500">
                      {image.createdAt.toLocaleString()}
                    </div>
                  )}
                  {isOwn && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleSetProfilePicture(image)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Set as profile picture
                      </button>
                      <button
                        onClick={() => handleDeleteImage(image)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {selectMode && !isOwn && (
                    <div className="text-xs text-gray-500">
                      Selection mode only available for your own gallery.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {message && (
          <div
            className={`text-sm ${
              message.type === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
