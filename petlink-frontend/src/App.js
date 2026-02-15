import React, { useState, useEffect } from "react";

// Простая функция для декодирования JWT без дополнительных библиотек
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userId, setUserId] = useState(() => {
    const storedId = localStorage.getItem("userId");
    return storedId ? parseInt(storedId, 10) : null;
  });
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [email, setEmail] = useState(""); // email пользователя
  const [role, setRole] = useState("owner"); // роль пользователя

  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [errors, setErrors] = useState({});

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderErrors, setOrderErrors] = useState({});
  const [editOrderErrors, setEditOrderErrors] = useState({});

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [newOrder, setNewOrder] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  
  const [toast, setToast] = useState(null);


  // Добавлено для редактирования заказа
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderData, setEditOrderData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "open",
  });


  const [statusFilter, setStatusFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

 
  // Для редактирования профиля
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState(username);
  const [editEmail, setEditEmail] = useState(email);
  const [editRole, setEditRole] = useState(role);
  const [editPassword, setEditPassword] = useState("");

  // Новое состояние для модального окна удаления профиля
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoggedIn = Boolean(token);

  const showToast = (message, type = "success") => {
  setToast({ message, type });

  let duration = 2500;
  if (type === "error") duration = 4000;
  if (type === "warning") duration = 3000;

  setTimeout(() => setToast(null), duration);
};

  // При загрузке токена, подтянуть профиль пользователя (email и роль)
  useEffect(() => {
    if (token && userId) {
      fetch(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.email) setEmail(data.email);
          if (data.role) setRole(data.role);
        })
        .catch(() => {
          // Игнорируем ошибки, например 401
        });
    }
  }, [token, userId]);


  useEffect(() => {
    if (!token) return;

    let url = `/care_orders/?order_by=${sortOrder}`;

    if (statusFilter) url += `&status=${statusFilter}`;
    if (startDateFilter) url += `&date_from=${startDateFilter}`;
    if (endDateFilter) url += `&date_to=${endDateFilter}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setOrders(data))
      .catch((err) => console.error("Failed to fetch orders:", err));
  }, [token, statusFilter, startDateFilter, endDateFilter, sortOrder]);

  useEffect(() => {
    if (selectedOrder && token) {
      fetch(`/messages/?order_id=${selectedOrder.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setMessages(data))
        .catch((err) => console.error("Failed to fetch messages:", err));
    } else {
      setMessages([]);
    }
  }, [selectedOrder, token]);


  // Заполнение формы редактирования заказа по выбранному заказу
  const startEditOrder = (order) => {
    setSelectedOrder(order);
    setEditOrderData({
      title: order.title || "",
      description: order.description || "",
      start_date: order.start_date ? order.start_date.slice(0, 10) : "",
      end_date: order.end_date ? order.end_date.slice(0, 10) : "",
      status: order.status || "open",
    });
    setIsEditingOrder(true);
  };

  // Обработка изменения полей формы редактирования заказа
  const handleEditOrderChange = (e) => {
    const { name, value } = e.target;
    setEditOrderData((prev) => ({ ...prev, [name]: value }));
  };

 const handleSaveOrder = () => {
  const { title, description, start_date, end_date, status } = editOrderData;
  const newErrors = {};

  if (!title || title.length < 3 || title.length > 100) {
    newErrors.title = "Title must be between 3 and 100 characters.";
  }

  if (description && description.length > 1000) {
    newErrors.description = "Description cannot exceed 1000 characters.";
  }

  if (!start_date) {
    newErrors.start_date = "Start date is required.";
  }

  if (!end_date) {
    newErrors.end_date = "End date is required.";
  }

  if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
    newErrors.end_date = "End date must be after start date.";
  }

  if (Object.keys(newErrors).length > 0) {
    setEditOrderErrors(newErrors);
    showToast("Please fix the errors before saving.", "error");
    return;
  }

  setEditOrderErrors({}); // сброс ошибок

  const payload = {
    title,
    description,
    start_date: new Date(start_date).toISOString(),
    end_date: new Date(end_date).toISOString(),
    status,
  };

  fetch(`/care_orders/${selectedOrder.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update order");
      }
      return res.json();
    })
    .then((updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      setSelectedOrder(updatedOrder);
      setIsEditingOrder(false);
      showToast("Order updated successfully", "success");
    })
    .catch((err) => showToast("Error updating order: " + err.message, "error"));
};


// --- LOGIN ---
const handleLogin = () => {
  fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Login failed");
      return res.json();
    })
    .then((data) => {
      if (!data.access_token) {
        showToast("Login response missing access_token", "error");
        return;
      }
      const decoded = parseJwt(data.access_token);
      const userIdFromToken = decoded ? parseInt(decoded.sub, 10) : null;

      if (!userIdFromToken) {
        showToast("Cannot get user ID from token", "error");
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userId", userIdFromToken);
      localStorage.setItem("username", username);
      setToken(data.access_token);
      setUserId(userIdFromToken);
      setIsRegistering(false);
      setPassword("");
      showToast("Logged in successfully", "success");
    })
    .catch((err) => showToast("Login error: " + err.message, "error"));
};

// --- REGISTER ---
const handleRegister = () => {
  const newErrors = {};

  if (username.length < 3 || username.length > 50) {
    newErrors.username = "Username must be between 3 and 50 characters.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    newErrors.email = "Please enter a valid email address.";
  }

  if (password.length < 8 || password.length > 128) {
    newErrors.password = "Password must be between 8 and 128 characters.";
  }

  if (role !== "owner" && role !== "petsitter") {
    newErrors.role = "Role must be either 'owner' or 'petsitter'.";
  }

  setErrors(newErrors);

  if (Object.keys(newErrors).length > 0) {
    showToast("Please correct the errors in the form.", "error");
    return;
  }

  fetch("/users/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, role }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Registration failed");
      return res.json();
    })
    .then(() => {
      showToast("Registration successful! You can now log in.", "success");
      setIsRegistering(false);
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("owner");
      setErrors({});
    })
    .catch((err) => showToast("Registration error: " + err.message, "error"));
};

// --- LOGOUT ---
const handleLogout = () => {
  localStorage.clear();
  setToken(null);
  setUserId(null);
  setUsername("");
  setPassword("");
  setEmail("");
  setRole("owner");
  setOrders([]);
  setMessages([]);
  setSelectedOrder(null);
  setIsEditingProfile(false);
  showToast("Logged out successfully", "success");
};

// --- SEND MESSAGE ---
const handleSendMessage = () => {
  if (!token || !userId || !selectedOrder || !newMessage.trim()) {
    showToast("Check that you're logged in and message is not empty", "warning");
    return;
  }

  fetch("/messages/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      order_id: selectedOrder.id,
      sender_id: userId,
      content: newMessage,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Message send failed");
      return res.json();
    })
    .then((msg) => {
      if (!msg.sender) msg.sender = { username };
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
      showToast("Message sent", "success");
    })
    .catch((err) => showToast("Failed to send message: " + err.message, "error"));
};

// --- CREATE ORDER ---
const handleCreateOrder = () => {
  const newErrors = {};
  const { title, description, start_date, end_date } = newOrder;

  if (!title || title.length < 3 || title.length > 100) {
    newErrors.title = "Title must be between 3 and 100 characters.";
  }

  if (description && description.length > 1000) {
    newErrors.description = "Description cannot exceed 1000 characters.";
  }

  if (!start_date) newErrors.start_date = "Start date is required.";
  if (!end_date) newErrors.end_date = "End date is required.";
  if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
    newErrors.end_date = "End date must be after start date.";
  }

  setOrderErrors(newErrors);

  if (Object.keys(newErrors).length > 0) {
    showToast("Please correct the errors in the form.", "error");
    return;
  }

  fetch("/care_orders/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      description,
      start_date: new Date(start_date).toISOString(),
      end_date: new Date(end_date).toISOString(),
      status: "open",
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to create order");
      }
      return res.json();
    })
    .then((created) => {
      setOrders((prev) => [...prev, created]);
      setNewOrder({ title: "", description: "", start_date: "", end_date: "" });
      setOrderErrors({});
      showToast("Order created successfully", "success");
    })
    .catch((err) => showToast("Error creating order: " + err.message, "error"));
};

// --- DELETE ORDER ---
const handleDeleteOrder = (orderId) => {
  if (!window.confirm("Are you sure you want to delete this order?")) return;

  fetch(`/messages/?order_id=${orderId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to delete messages");
      return fetch(`/care_orders/${orderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to delete order");
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setSelectedOrder(null);
      setMessages([]);
      showToast("Order and messages deleted successfully", "success");
    })
    .catch((err) => showToast(err.message, "error"));
};

// --- DELETE MESSAGE ---
const handleDeleteMessage = (messageId) => {
  if (!window.confirm("Delete this message?")) return;

  fetch(`/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to delete message");
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      showToast("Message deleted", "success");
    })
    .catch((err) => showToast("Error deleting message: " + err.message, "error"));
};

// --- PROFILE SAVE ---
const handleProfileSave = () => {
  const body = { username: editUsername, email: editEmail, role: editRole };
  if (editPassword.trim()) body.password = editPassword;

  fetch(`/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((err) => {
          throw new Error(err.detail?.map((d) => d.msg).join(", ") || "Failed to update profile");
        });
      }
      return res.json();
    })
    .then((data) => {
      setUsername(data.username);
      setEmail(data.email);
      setRole(data.role);
      localStorage.setItem("username", data.username);
      setIsEditingProfile(false);
      setEditPassword("");
      showToast("Profile updated successfully", "success");
    })
    .catch((err) => showToast("Profile update error: " + err.message, "error"));
};

// --- DELETE PROFILE ---
const handleDeleteProfile = () => {
  if (!deletePassword) {
    showToast("Please enter your password to confirm deletion", "warning");
    return;
  }

  setIsDeleting(true);

  fetch(`/users/${userId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password: deletePassword }),
  })
    .then((res) => {
      setIsDeleting(false);
      if (res.status === 204) {
        handleLogout();
        showToast("Profile deleted successfully", "success");
      } else if (res.status === 403) {
        showToast("Incorrect password", "error");
      } else if (res.status === 404) {
        showToast("User not found", "error");
      } else {
        return res.json().then((err) => {
          throw new Error(err.detail || "Failed to delete profile");
        });
      }
    })
    .catch((err) => {
      setIsDeleting(false);
      showToast("Error deleting profile: " + err.message, "error");
    });
};

  return (
    <div
      style={{
        display: "flex",
        padding: 20,
        fontFamily: "sans-serif",
        minHeight: "100vh",
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* --- TOAST --- */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            padding: 12,
            background:
              toast.type === "error"
                ? "#e74c3c"
                : toast.type === "warning"
                ? "#f39c12"
                : "#2ecc71",
            color: "#fff",
            borderRadius: 6,
            zIndex: 10000,
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* --- LEFT PANEL --- */}
      <div style={{ width: "30%", borderRight: "1px solid #ccc", paddingRight: 20 }}>
        {!isLoggedIn ? (
          <>
            <h2>{isRegistering ? "Register" : "Login"}</h2>

            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", marginBottom: 4 }}
            />
            {errors.username && (
              <small style={{ color: "red", display: "block", marginBottom: 8 }}>
                {errors.username}
              </small>
            )}

            {isRegistering && (
              <>
                <input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", marginBottom: 4 }}
                />
                {errors.email && (
                  <small style={{ color: "red", display: "block", marginBottom: 8 }}>
                    {errors.email}
                  </small>
                )}
              </>
            )}

            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", marginBottom: 4 }}
            />
            {errors.password && (
              <small style={{ color: "red", display: "block", marginBottom: 8 }}>
                {errors.password}
              </small>
            )}

            {isRegistering && (
              <>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: "100%", marginBottom: 4 }}
                >
                  <option value="owner">Owner</option>
                  <option value="petsitter">Pet Sitter</option>
                </select>
                {errors.role && (
                  <small style={{ color: "red", display: "block", marginBottom: 8 }}>
                    {errors.role}
                  </small>
                )}
              </>
            )}

            <button onClick={isRegistering ? handleRegister : handleLogin}>
              {isRegistering ? "Register" : "Login"}
            </button>

            <button
              onClick={() => setIsRegistering((prev) => !prev)}
              style={{ marginTop: 10 }}
            >
              {isRegistering ? "Back to Login" : "Register"}
            </button>
          </>
        ) : (
          <>
            {/* --- PROFILE MANAGEMENT --- */}
            {!isEditingProfile ? (
              <>
                <button
                  onClick={handleLogout}
                  style={{
                    marginTop: 20,
                    background: "#e74c3c",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 4,
                    cursor: "pointer",
                    width: "100%",
                    marginBottom: 10,
                  }}
                >
                  Logout
                </button>
                <button
                  onClick={() => {
                    setIsEditingProfile(true);
                    setEditUsername(username);
                    setEditEmail(email);
                    setEditRole(role);
                    setEditPassword("");
                  }}
                  style={{
                    background: "#3498db",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 4,
                    cursor: "pointer",
                    width: "100%",
                    marginBottom: 10,
                  }}
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    setDeletePassword("");
                  }}
                  style={{
                    background: "#c0392b",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 4,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Delete Profile
                </button>
              </>
            ) : (
              <div
                style={{
                  border: "1px solid #ccc",
                  padding: 10,
                  borderRadius: 4,
                  marginBottom: 10,
                }}
              >
                <h3>Edit Profile</h3>
                <input
                  placeholder="Username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  style={{ width: "100%", marginBottom: 8 }}
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{ width: "100%", marginBottom: 8 }}
                />
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  style={{ width: "100%", marginBottom: 8 }}
                >
                  <option value="owner">Owner</option>
                  <option value="petsitter">Pet Sitter</option>
                </select>
                <input
                  placeholder="New Password (leave empty to keep current)"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  style={{ width: "100%", marginBottom: 8 }}
                />
                <button
                  onClick={handleProfileSave}
                  style={{
                    background: "#2ecc71",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 4,
                    cursor: "pointer",
                    marginRight: 10,
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  style={{
                    background: "#95a5a6",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* --- DELETE MODAL --- */}
            {isDeleteModalOpen && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1000,
                }}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "#fff",
                    padding: 20,
                    borderRadius: 8,
                    width: 320,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                  }}
                >
                  <h3>Confirm Delete Profile</h3>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    style={{ width: "100%", marginBottom: 12, padding: 8 }}
                    disabled={isDeleting}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setIsDeleteModalOpen(false)}
                      style={{
                        marginRight: 10,
                        background: "#95a5a6",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteProfile}
                      style={{
                        background: "#c0392b",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- CREATE ORDER --- */}
            {role === "owner" && (
              <>
                <h2 style={{ marginTop: 30 }}>Create Order</h2>
                <div
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 12,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <input
                    placeholder="Title"
                    value={newOrder.title}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, title: e.target.value })
                    }
                    style={{ width: "100%", marginBottom: 4 }}
                  />
                  {orderErrors.title && (
                    <small style={{ color: "red" }}>{orderErrors.title}</small>
                  )}
                  <small style={{ color: "#444" }}>Title length: 3–100 characters</small>
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 12,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <textarea
                    placeholder="Description"
                    value={newOrder.description}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, description: e.target.value })
                    }
                    style={{ width: "100%", marginBottom: 4 }}
                  />
                  {orderErrors.description && (
                    <small style={{ color: "red" }}>{orderErrors.description}</small>
                  )}
                  <small style={{ color: "#444" }}>
                    Description max 1000 characters (optional)
                  </small>
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 12,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <input
                    type="datetime-local"
                    value={newOrder.start_date}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, start_date: e.target.value })
                    }
                    style={{ width: "100%", marginBottom: 4 }}
                  />
                  {orderErrors.start_date && (
                    <small style={{ color: "red" }}>{orderErrors.start_date}</small>
                  )}
                  <small style={{ color: "#444" }}>Start date and time</small>
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 12,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <input
                    type="datetime-local"
                    value={newOrder.end_date}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, end_date: e.target.value })
                    }
                    style={{ width: "100%", marginBottom: 4 }}
                  />
                  {orderErrors.end_date && (
                    <small style={{ color: "red" }}>{orderErrors.end_date}</small>
                  )}
                  <small style={{ color: "#444" }}>End date and time</small>
                </div>

                <button onClick={handleCreateOrder}>Create</button>
              </>
            )}

            {/* --- FILTERS --- */}
            <h3>Filters</h3>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 15,
                flexWrap: "wrap",
              }}
            >
              {role === "owner" && (
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="canceled">Canceled</option>
                </select>
              )}
              <div>
                From:
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                />
              </div>
              <div>
                To:
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />
              </div>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="asc">Date ↑</option>
                <option value="desc">Date ↓</option>
              </select>
              <button
                onClick={() => {
                  setStatusFilter("");
                  setStartDateFilter("");
                  setEndDateFilter("");
                  setSortOrder("asc");
                }}
              >
                Reset
              </button>
            </div>

            {/* --- ORDERS LIST --- */}
            <h2>Orders</h2>
            {Array.isArray(orders) && orders.length > 0 ? (
              orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    padding: 10,
                    margin: "10px 0",
                    background:
                      selectedOrder?.id === order.id
                        ? "rgba(255, 255, 255, 0.95)"
                        : "rgba(255, 255, 255, 0.8)",
                    cursor: "pointer",
                    borderRadius: 4,
                    boxShadow:
                      selectedOrder?.id === order.id
                        ? "0 4px 12px rgba(0,0,0,0.2)"
                        : "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsEditingOrder(false);
                  }}
                >
                  <strong>{order.title || order.id}</strong>
                  <p style={{ margin: "4px 0", color: "#555" }}>
                    {order.description
                      ? order.description.slice(0, 60) + "..."
                      : "No description"}
                  </p>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 12,
                      color: "#fff",
                      backgroundColor:
                        order.status === "open"
                          ? "#3498db"
                          : order.status === "in_progress"
                          ? "#f1c40f"
                          : order.status === "completed"
                          ? "#2ecc71"
                          : order.status === "canceled"
                          ? "#e74c3c"
                          : "#7f8c8d",
                    }}
                  >
                    {order.status.replace("_", " ")}
                  </span>
                </div>
              ))
            ) : (
              <p>No orders</p>
            )}
          </>
        )}
      </div>

      {/* --- RIGHT PANEL --- */}
      <div style={{ width: "70%", paddingLeft: 20 }}>
        {selectedOrder ? (
          <div
            style={{
              background: "rgba(255,255,255,0.85)",
              padding: 20,
              borderRadius: 8,
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            {isEditingOrder ? (
              <div>
                <h2>Edit Order</h2>
                <input
                  placeholder="Title"
                  name="title"
                  value={editOrderData.title}
                  onChange={handleEditOrderChange}
                  style={{ width: "100%", marginBottom: 8 }}
                />
                {editOrderErrors.title && (
                  <small style={{ color: "red" }}>{editOrderErrors.title}</small>
                )}
                <textarea
                  placeholder="Description"
                  name="description"
                  value={editOrderData.description}
                  onChange={handleEditOrderChange}
                  style={{ width: "100%", marginBottom: 8 }}
                />
                {editOrderErrors.description && (
                  <small style={{ color: "red" }}>{editOrderErrors.description}</small>
                )}
                <input
                  type="datetime-local"
                  name="start_date"
                  value={editOrderData.start_date}
                  onChange={handleEditOrderChange}
                  style={{ width: "100%", marginBottom: 8 }}
                />
                {editOrderErrors.start_date && (
                  <small style={{ color: "red" }}>{editOrderErrors.start_date}</small>
                )}
                <input
                  type="datetime-local"
                  name="end_date"
                  value={editOrderData.end_date}
                  onChange={handleEditOrderChange}
                  style={{ width: "100%", marginBottom: 8 }}
                />
                {editOrderErrors.end_date && (
                  <small style={{ color: "red" }}>{editOrderErrors.end_date}</small>
                )}
                <select
                  name="status"
                  value={editOrderData.status}
                  onChange={handleEditOrderChange}
                  style={{ width: "100%", marginBottom: 8 }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="canceled">Canceled</option>
                </select>
                <button onClick={handleSaveOrder}>Save</button>
                <button onClick={() => setIsEditingOrder(false)}>Cancel</button>
              </div>
            ) : (
              <>
                <h2>{selectedOrder.title}</h2>
                <p>{selectedOrder.description || "No description"}</p>
                <p>
                  <strong>Start:</strong>{" "}
                  {selectedOrder.start_date
                    ? new Date(selectedOrder.start_date).toLocaleString()
                    : "N/A"}
                </p>
                <p>
                  <strong>End:</strong>{" "}
                  {selectedOrder.end_date
                    ? new Date(selectedOrder.end_date).toLocaleString()
                    : "N/A"}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      color: "#fff",
                      backgroundColor:
                        selectedOrder.status === "open"
                          ? "#3498db"
                          : selectedOrder.status === "in_progress"
                          ? "#f1c40f"
                          : selectedOrder.status === "completed"
                          ? "#2ecc71"
                          : selectedOrder.status === "canceled"
                          ? "#e74c3c"
                          : "#7f8c8d",
                    }}
                  >
                    {selectedOrder.status.replace("_", " ")}
                  </span>
                </p>

                <p>
                  <strong>Author:</strong> {selectedOrder.owner?.username || "Unknown"}
                </p>

                {userId === selectedOrder.owner_id && (
                  <>
                    <button
                      onClick={() => startEditOrder(selectedOrder)}
                      style={{
                        marginRight: 10,
                        background: "#3498db",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Edit Order
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(selectedOrder.id)}
                      style={{
                        background: "#c0392b",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Delete Order
                    </button>
                  </>
                )}

                <div style={{ marginTop: 20 }}>
                  <h3>Messages</h3>
                  <div
                    style={{
                      maxHeight: "300px",
                      overflowY: "auto",
                      border: "1px solid #ccc",
                      padding: 10,
                      borderRadius: 6,
                    }}
                  >
                    {messages.length > 0 ? (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            marginBottom: 8,
                            padding: 6,
                            background: "#f8f8f8",
                            borderRadius: 4,
                          }}
                        >
                          <strong>{msg.sender?.username || "Unknown"}:</strong>{" "}
                          {msg.content}
                          {userId === msg.sender_id && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              style={{
                                marginLeft: 10,
                                fontSize: 10,
                                background: "#e74c3c",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                padding: "2px 4px",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>No messages yet</p>
                    )}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      style={{ flex: 1, padding: 6 }}
                    />
                    <button
                      onClick={handleSendMessage}
                      style={{
                        background: "#2ecc71",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "6px 12px",
                        cursor: "pointer",
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: 20,
              border: "1px solid #ccc",
              borderRadius: 8,
              background: "rgba(255,255,255,0.6)",
              minHeight: "40vh",
            }}
          >
            <h2>Welcome to PetLink!</h2>
            <p>
              PetLink is an online service that helps pet owners find trusted pet sitters for temporary care.
              Users can create pet care orders, receive offers from sitters, and chat.
            </p>

            <h2>Добро пожаловать в PetLink!</h2>
            <p>
              PetLink — это онлайн-сервис, который помогает владельцам животных находить
              проверенных петситтеров для передержки. Пользователи могут создавать заказы
              на уход за питомцем, получать предложения от исполнителей и общаться в чате.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
