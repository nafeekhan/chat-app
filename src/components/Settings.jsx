import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { doc, setDoc } from "firebase/firestore";
import {
  updateEmail,
  updatePassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { db, auth } from "../firebase/config";
import { updateUser } from "../redux/userSlice";

const defaultPrivacy = {
  wall: "friends",
  chat: "anyone",
  gallery: "friends",
};

export default function Settings() {
  const user = useSelector((s) => s.user.user);
  const dispatch = useDispatch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [privacy, setPrivacy] = useState(defaultPrivacy);
  const [saving, setSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState(null);
  const [emailMessage, setEmailMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.displayName || "");
    setEmail(user.email || "");
    setPrivacy({
      wall: user.privacy?.wall || defaultPrivacy.wall,
      chat: user.privacy?.chat || defaultPrivacy.chat,
      gallery: user.privacy?.gallery || defaultPrivacy.gallery,
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setInfoMessage(null);
    try {
      if (auth.currentUser && name && name !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: name });
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          name,
          privacy,
        },
        { merge: true }
      );

      dispatch(
        updateUser({
          displayName: name,
          privacy,
        })
      );

      setInfoMessage({ type: "success", text: "Settings updated successfully." });
    } catch (err) {
      console.error("Error saving settings:", err);
      setInfoMessage({
        type: "error",
        text: err.message || "Unable to save settings. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!user || !auth.currentUser) return;
    if (!email.trim()) {
      setEmailMessage({ type: "error", text: "Email cannot be empty." });
      return;
    }
    setEmailMessage(null);
    try {
      if (email !== user.email) {
        await updateEmail(auth.currentUser, email.trim());
        await setDoc(
          doc(db, "users", user.uid),
          { email: email.trim() },
          { merge: true }
        );
        dispatch(updateUser({ email: email.trim() }));
      }
      setEmailMessage({
        type: "success",
        text: "Email updated. Please verify if required.",
      });
    } catch (err) {
      console.error("Error updating email:", err);
      setEmailMessage({
        type: "error",
        text:
          err.code === "auth/requires-recent-login"
            ? "Please re-login and try again to update email."
            : err.message || "Unable to update email.",
      });
    }
  };

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    setEmailMessage(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setEmailMessage({
        type: "success",
        text: "Verification email sent. Please check your inbox.",
      });
    } catch (err) {
      console.error("Error sending verification email:", err);
      setEmailMessage({
        type: "error",
        text: err.message || "Unable to send verification email.",
      });
    }
  };

  const handlePasswordUpdate = async () => {
    if (!auth.currentUser) return;
    setPasswordMessage(null);
    if (!newPassword) {
      setPasswordMessage({ type: "error", text: "Please enter a new password." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Password should be at least 6 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
      setPasswordMessage({
        type: "success",
        text: "Password updated successfully.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error updating password:", err);
      setPasswordMessage({
        type: "error",
        text:
          err.code === "auth/requires-recent-login"
            ? "Please re-login and try again to update password."
            : err.message || "Unable to update password.",
      });
    }
  };

  if (!user) {
    return <div className="p-6 text-center text-gray-600">Loading settings...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6 space-y-6">
        <h2 className="text-2xl font-semibold">Settings</h2>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Profile</h3>
          <label className="block text-sm text-gray-600">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded p-2"
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Email</h3>
          <label className="block text-sm text-gray-600">Email Address</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded p-2"
            type="email"
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleEmailUpdate}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Update Email
            </button>
            <button
              onClick={handleSendVerification}
              className="border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50"
            >
              Send Verification Email
            </button>
          </div>
          {emailMessage && (
            <div
              className={`text-sm ${
                emailMessage.type === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {emailMessage.text}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Password</h3>
          <label className="block text-sm text-gray-600">New Password</label>
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border rounded p-2"
            type="password"
          />
          <label className="block text-sm text-gray-600">Confirm New Password</label>
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded p-2"
            type="password"
          />
          <button
            onClick={handlePasswordUpdate}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Update Password
          </button>
          {passwordMessage && (
            <div
              className={`text-sm ${
                passwordMessage.type === "error"
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {passwordMessage.text}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Privacy Controls</h3>
          <PrivacySelect
            label="Who can post on wall?"
            value={privacy.wall}
            onChange={(value) =>
              setPrivacy((prev) => ({
                ...prev,
                wall: value,
              }))
            }
            options={[
              { value: "anyone", label: "Anyone" },
              { value: "friends", label: "Friends" },
              { value: "only me", label: "Only me" },
            ]}
          />
          <PrivacySelect
            label="Who can send you Chat message?"
            value={privacy.chat}
            onChange={(value) =>
              setPrivacy((prev) => ({
                ...prev,
                chat: value,
              }))
            }
            options={[
              { value: "anyone", label: "Anyone" },
              { value: "friends", label: "Friends" },
              { value: "only me", label: "Only me" },
            ]}
          />
          <PrivacySelect
            label="Who can view gallery?"
            value={privacy.gallery}
            onChange={(value) =>
              setPrivacy((prev) => ({
                ...prev,
                gallery: value,
              }))
            }
            options={[
              { value: "friends", label: "Friends" },
              { value: "anyone", label: "Anyone" },
              { value: "only me", label: "Only me" },
            ]}
          />
        </section>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {infoMessage && (
            <span
              className={`text-sm ${
                infoMessage.type === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {infoMessage.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PrivacySelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-sm text-gray-600 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded p-2 bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

