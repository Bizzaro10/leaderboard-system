import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import "./index.css";
import { useRef } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000" || https://leaderboard-system-2e2v.onrender.com;
const socket = io(API, { transports: ["websocket"] });

function formatPoints(points) {
  return (
    points?.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) || "0.000"
  );
}

const defaultAvatar = "images/pfp-1.jpg";

const App = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newUserImage, setNewUserImage] = useState("");
  const [newUserImageFile, setNewUserImageFile] = useState(null);
  const fileInputRef = useRef();
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastClaim, setLastClaim] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editUserId, setEditUserId] = useState("");
  const [editUserImage, setEditUserImage] = useState("");
  const [editUserImageFile, setEditUserImageFile] = useState(null);
  const editFileInputRef = useRef();

  // Fetch users and leaderboard
  const fetchUsers = async () => {
    const res = await fetch(`${API}/api/users`);
    setUsers(await res.json());
  };
  const fetchLeaderboard = async () => {
    const res = await fetch(`${API}/api/leaderboard`);
    setLeaderboard(await res.json());
  };
  const fetchHistory = async () => {
    const res = await fetch(`${API}/api/history`);
    setHistory(await res.json());
  };

  useEffect(() => {
    fetchUsers();
    fetchLeaderboard();
    fetchHistory();
    socket.on("leaderboardUpdate", () => {
      fetchUsers();
      fetchLeaderboard();
      fetchHistory();
    });
    return () => socket.off("leaderboardUpdate");
    // eslint-disable-next-line
  }, []);

  // Add new user
  const handleAddUser = async () => {
    if (!newUser.trim()) return;
    const formData = new FormData();
    formData.append("name", newUser);
    if (newUserImageFile) {
      formData.append("profileImage", newUserImageFile);
    } else if (newUserImage) {
      formData.append("profileImage", newUserImage);
    }
    await fetch(`${API}/api/users`, {
      method: "POST",
      body: formData,
    });
    setNewUser("");
    setNewUserImage("");
    setNewUserImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Claim points
  const handleClaim = async () => {
    if (!selectedUser) return;
    const res = await fetch(`${API}/api/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUser }),
    });
    const data = await res.json();
    setLastClaim({
      ...data,
      name: users.find((u) => u._id === selectedUser)?.name,
    });
  };

  // Update user profile image
  const handleEditUserImage = async () => {
    if (!editUserId) return;
    const formData = new FormData();
    if (editUserImageFile) {
      formData.append("profileImage", editUserImageFile);
    } else if (editUserImage) {
      formData.append("profileImage", editUserImage);
    }
    await fetch(`${API}/api/users/${editUserId}`, {
      method: "PATCH",
      body: formData,
    });
    setEditUserId("");
    setEditUserImage("");
    setEditUserImageFile(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  // Split leaderboard
  const top3 = leaderboard.slice(0, 3);
  const lowerRanks = leaderboard.slice(3, 9); // up to 9th place

  // Helper to get user image or fallback
  const getUserAvatar = (user, size = 100) => {
    let src = user?.profileImage;
    if (src && !src.startsWith("http")) {
      src = `http://localhost:5000${src}`;
    }
    if (src) {
      return (
        <img
          src={src}
          alt="User"
          className={`rounded-full object-cover border-4`}
          style={{ width: size, height: size }}
        />
      );
    }
    // Default: colored circle with first letter
    const bgColors = [
      "bg-yellow-400",
      "bg-orange-400",
      "bg-yellow-600",
      "bg-orange-300",
      "bg-yellow-500",
    ];
    const color = bgColors[(user?.name?.charCodeAt(0) || 0) % bgColors.length];
    return (
      <div
        className={`flex items-center justify-center ${color} text-white font-bold rounded-full border-4 border-gray-200`}
        style={{ width: size, height: size, fontSize: size / 2 }}
      >
        {user?.name?.[0]?.toUpperCase() || "?"}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-200 to-yellow-200 font-sans relative">
      {/* Top Navigation Bar */}
      <div className="relative flex items-center justify-between p-4 text-white z-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        {/* <div className="flex items-center space-x-2">
          <span className="text-sm">Settlement time 2 days 01:45:29</span>
        </div> */}
        {/* <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm px-4 py-2 rounded-full flex items-center space-x-1 shadow-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Rewards</span>
        </div> */}
      </div>

      {/* Gold Trophy */}
      <div className="relative flex justify-center mt-4 mb-8 z-10">
        <img
          src="images/trophy.png"
          alt="Gold Trophy"
          className="w-28 h-28 object-contain"
        />
      </div>

      {/* Top 3 Podium */}
      <div
        className="relative flex justify-center items-end space-x-4 mx-4 mt-8 mb-8 z-10"
        style={{ height: 220 }}
      >
        {/* Second Place */}
        <div className="flex flex-col items-center" style={{ zIndex: 2 }}>
          {top3[1] && (
            <>
              {getUserAvatar(top3[1], 80)}
              <div
                className="flex flex-col items-center justify-end bg-gradient-to-t from-gray-300 to-gray-100 rounded-t-xl shadow-lg"
                style={{ height: 110, width: 90 }}
              >
                <div className="text-lg font-bold text-gray-700">2</div>
                <div className="text-sm font-semibold text-gray-700 truncate w-full text-center px-1">
                  {top3[1].name}
                </div>
                <div className="text-xs text-gray-600">
                  {formatPoints(top3[1].totalPoints)}
                </div>
              </div>
            </>
          )}
        </div>
        {/* First Place */}
        <div
          className="flex flex-col items-center"
          style={{ zIndex: 3, position: "relative" }}
        >
          {top3[0] && (
            <>
              <div className="relative mb-2" style={{ width: 96, height: 96 }}>
                {getUserAvatar(top3[0], 96)}
                <img
                  src="/images/crown.png"
                  alt="Crown"
                  className="absolute top-0 right-0 w-10 h-8"
                  style={{ zIndex: 10 }}
                />
              </div>
              <div
                className="flex flex-col items-center justify-end bg-gradient-to-t from-yellow-400 to-yellow-200 rounded-t-xl shadow-xl border-2 border-yellow-500"
                style={{ height: 150, width: 100 }}
              >
                <div className="text-lg font-bold text-yellow-800 flex items-center gap-1">
                  1
                </div>
                <div className="text-base font-bold text-yellow-900 truncate w-full text-center px-1">
                  {top3[0].name}
                </div>
                <div className="text-xs text-yellow-800">
                  {formatPoints(top3[0].totalPoints)}
                </div>
              </div>
            </>
          )}
        </div>
        {/* Third Place */}
        <div className="flex flex-col items-center" style={{ zIndex: 1 }}>
          {top3[2] && (
            <>
              {getUserAvatar(top3[2], 80)}
              <div
                className="flex flex-col items-center justify-end bg-gradient-to-t from-yellow-700 to-yellow-300 rounded-t-xl shadow-lg"
                style={{ height: 80, width: 90 }}
              >
                <div className="text-lg font-bold text-yellow-900">3</div>
                <div className="text-sm font-semibold text-yellow-900 truncate w-full text-center px-1">
                  {top3[2].name}
                </div>
                <div className="text-xs text-yellow-800">
                  {formatPoints(top3[2].totalPoints)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lower Ranking List - single color background */}
      <div className="mx-4 mt-4 rounded-2xl shadow-lg p-4 pb-0 z-10 bg-yellow-50">
        {lowerRanks.map((item, index) => (
          <div
            key={item._id}
            className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
          >
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 font-semibold w-8 text-center">
                {item.rank}
              </span>
              {getUserAvatar(item, 40)}
              <span className="text-gray-800 font-medium">{item.name}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-yellow-800 font-semibold">
                {formatPoints(item.totalPoints)}
              </span>
              <img
                src="images/t.png"
                alt="Coin"
                className="w-20 h-20  object-contain"
              />
            </div>
          </div>
        ))}
      </div>

      {/* User selection, claim, and add user */}
      <div className="mx-4 mt-8 bg-white rounded-2xl shadow-lg p-4 z-10 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">Select User</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleClaim}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full shadow-md hover:from-yellow-500 hover:to-orange-600 transition"
        >
          Claim
        </button>
        <input
          type="text"
          placeholder="Add new user"
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        {/* <input
          type="text"
          placeholder="Profile image URL (optional)"
          value={newUserImage}
          onChange={(e) => setNewUserImage(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        /> */}
        {/* <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={(e) => setNewUserImageFile(e.target.files[0])}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        /> */}
        <button
          onClick={handleAddUser}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full shadow-md hover:from-yellow-500 hover:to-orange-600 transition"
        >
          Add User
        </button>
      </div>

      {/* Edit user profile image */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-lg p-4 z-10 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
        <select
          value={editUserId}
          onChange={(e) => setEditUserId(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">Select User to Edit PFP</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="New profile image URL (optional)"
          value={editUserImage}
          onChange={(e) => setEditUserImage(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <input
          type="file"
          accept="image/*"
          ref={editFileInputRef}
          onChange={(e) => setEditUserImageFile(e.target.files[0])}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <button
          onClick={handleEditUserImage}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full shadow-md hover:from-yellow-500 hover:to-orange-600 transition"
        >
          Set/Change PFP
        </button>
      </div>

      {/* Last claim notification */}
      {lastClaim && (
        <div className="mx-4 mt-4 bg-green-100 text-green-800 rounded-2xl shadow-lg p-4 z-10 text-center">
          {lastClaim.name} awarded <b>{lastClaim.pointsAwarded}</b> points!
        </div>
      )}

      {/* Claim History Dropdown */}
      <div className="mx-4 mt-8 mb-8 bg-white rounded-2xl shadow-lg p-4 z-10">
        <button
          className="flex items-center gap-2 text-lg font-bold mb-4 focus:outline-none"
          onClick={() => setShowHistory((v) => !v)}
        >
          <span>Claim History</span>
          <svg
            className={`w-5 h-5 transform transition-transform ${
              showHistory ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {showHistory && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left">User</th>
                  <th className="px-2 py-1 text-left">Points</th>
                  <th className="px-2 py-1 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h._id}>
                    <td className="px-2 py-1">{h.userId?.name || "Unknown"}</td>
                    <td className="px-2 py-1">{h.points}</td>
                    <td className="px-2 py-1">
                      {new Date(h.claimedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
