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

  

  // Добавлено для редактирования заказа
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderData, setEditOrderData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "open",
  });

 
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
    if (token) {
      fetch("/care_orders/", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setOrders(data))
        .catch((err) => console.error("Failed to fetch orders:", err));
    }
  }, [token]);

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

  function toISOStringWithSeconds(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString();
  }

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
  if (!selectedOrder) return;

  const newErrors = {};
  const { title, description, start_date, end_date, status } = editOrderData;

  // Валидация
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
  if (!["open", "in_progress", "completed", "canceled"].includes(status)) {
    newErrors.status = "Invalid status selected.";
  }

  // Если есть ошибки, показываем и прекращаем отправку
  if (Object.keys(newErrors).length > 0) {
    setEditOrderErrors(newErrors);
    alert("Please fix the errors before saving.");
    return;
  }

  // Если ошибок нет, отправляем запрос
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
      alert("Order updated successfully");
    })
    .catch((err) => alert("Error updating order: " + err.message));
};

  const cancelEditOrder = () => {
    setIsEditingOrder(false);
  };

  // Далее идут уже твои handleLogin, handleRegister, handleLogout и другие...

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
          alert("Login response missing access_token");
          return;
        }
        const decoded = parseJwt(data.access_token);
        const userIdFromToken = decoded ? parseInt(decoded.sub, 10) : null;

        if (!userIdFromToken) {
          alert("Cannot get user ID from token");
          return;
        }

        localStorage.setItem("token", data.access_token);
        localStorage.setItem("userId", userIdFromToken);
        localStorage.setItem("username", username);
        setToken(data.access_token);
        setUserId(userIdFromToken);
        setIsRegistering(false);
        setPassword("");
      })
      .catch((err) => alert("Login error: " + err.message));
  };

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
    alert("Please correct the errors in the form.");
    return;
  }

  // Отправка запроса на бэкенд
  fetch("/users/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email,
      password,
      role,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Registration failed");
      return res.json();
    })
    .then(() => {
      alert("Registration successful! You can now log in.");
      setIsRegistering(false);
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("owner");
      setErrors({});
    })
    .catch((err) => alert("Registration error: " + err.message));
};

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
  };

  const handleSendMessage = () => {
    if (!token || !userId || !selectedOrder || !newMessage.trim()) {
      alert("Check that you're logged in and message is not empty");
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
      })
      .catch((err) => console.error("Failed to send message:", err));
  };

  const handleCreateOrder = () => {
  const newErrors = {};
  const { title, description, start_date, end_date } = newOrder;

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

  setOrderErrors(newErrors);

  if (Object.keys(newErrors).length > 0) {
    alert("Please correct the errors in the form.");
    return;
  }

  // Отправляем запрос, если ошибок нет
  fetch("/care_orders/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      description,
      start_date: toISOStringWithSeconds(start_date),
      end_date: toISOStringWithSeconds(end_date),
      status: "open",
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Create order error:", errorData);
        throw new Error("Failed to create order");
      }
      return res.json();
    })
    .then((created) => {
      setOrders((prev) => [...prev, created]);
      setNewOrder({ title: "", description: "", start_date: "", end_date: "" });
      setOrderErrors({});
      alert("Order created successfully");
    })
    .catch((err) => alert("Error: " + err.message));
};

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
        alert("Order and messages deleted successfully");
      })
      .catch((err) => alert(err.message));
  };

  const handleDeleteMessage = (messageId) => {
    if (!window.confirm("Delete this message?")) return;

    fetch(`/messages/${messageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete message");
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      })
      .catch((err) => alert("Error deleting message: " + err.message));
  };

  // Сохранение изменений профиля
  const handleProfileSave = () => {
    const body = {
      username: editUsername,
      email: editEmail,
      role: editRole,
    };
    if (editPassword.trim() !== "") {
      body.password = editPassword;
    }

    fetch(`/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(
              err.detail?.map((d) => d.msg).join(", ") || "Failed to update profile"
            );
          });
        }
        return res.json();
      })
      .then((data) => {
        alert("Profile updated successfully");
        setUsername(data.username);
        setEmail(data.email);
        setRole(data.role);
        localStorage.setItem("username", data.username);
        setIsEditingProfile(false);
        setEditPassword("");
      })
      .catch((err) => alert("Profile update error: " + err.message));
  };

  // Новый обработчик удаления профиля с паролем
  const handleDeleteProfile = () => {
    if (!deletePassword) {
      alert("Please enter your password to confirm deletion");
      return;
    }
    setIsDeleting(true);
    fetch(`/users/${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: deletePassword }),
    })
      .then((res) => {
        setIsDeleting(false);
        if (res.status === 204) {
          alert("Profile deleted successfully");
          handleLogout();
        } else if (res.status === 403) {
          alert("Incorrect password");
        } else if (res.status === 404) {
          alert("User not found");
        } else {
          return res.json().then((err) => {
            throw new Error(err.detail || "Failed to delete profile");
          });
        }
      })
      .catch((err) => {
        setIsDeleting(false);
        alert("Error deleting profile: " + err.message);
      });
  };

  return (
    <div style={{ display: "flex", padding: 20, fontFamily: "sans-serif" }}>
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

            {/* Модальное окно удаления профиля */}
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

            {/* Create Order и Orders показываем, когда залогинен */}
            <h2 style={{ marginTop: 30 }}>Create Order</h2>
            <div style={{ marginBottom: 8 }}>
              <input
                placeholder="Title"
                value={newOrder.title}
                onChange={(e) => setNewOrder({ ...newOrder, title: e.target.value })}
                style={{ width: "100%" }}
              />
              {orderErrors.title && (
                <small style={{ color: "red" }}>{orderErrors.title}</small>
              )}
              <small style={{ color: "#666" }}>
                Title length: 3-100 characters
              </small>
            </div>

            <div style={{ marginBottom: 8 }}>
              <textarea
                placeholder="Description"
                value={newOrder.description}
                onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                style={{ width: "100%" }}
              />
              {orderErrors.description && (
                <small style={{ color: "red" }}>{orderErrors.description}</small>
              )}
              <small style={{ color: "#666" }}>
                Description max 1000 characters (optional)
              </small>
            </div>

            <div style={{ marginBottom: 8 }}>
              <input
                type="datetime-local"
                value={newOrder.start_date}
                onChange={(e) => setNewOrder({ ...newOrder, start_date: e.target.value })}
                style={{ width: "100%" }}
              />
              {orderErrors.start_date && (
                <small style={{ color: "red" }}>{orderErrors.start_date}</small>
              )}
              <small style={{ color: "#666" }}>Start date and time</small>
            </div>

            <div style={{ marginBottom: 8 }}>
              <input
                type="datetime-local"
                value={newOrder.end_date}
                onChange={(e) => setNewOrder({ ...newOrder, end_date: e.target.value })}
                style={{ width: "100%" }}
              />
              {orderErrors.end_date && (
                <small style={{ color: "red" }}>{orderErrors.end_date}</small>
              )}
              <small style={{ color: "#666" }}>End date and time</small>
            </div>

            <button onClick={handleCreateOrder}>Create</button>
          </>
        )}

        <h2>Orders</h2>
        {orders.length === 0 && <p>No orders</p>}
        {orders.map((order) => (
          <div
            key={order.id}
            style={{
              padding: 10,
              margin: "10px 0",
              background: selectedOrder?.id === order.id ? "#eee" : "#f9f9f9",
              cursor: "pointer",
              borderRadius: 4,
            }}
            onClick={() => setSelectedOrder(order)}
          >
            Order: <strong>{order.title || order.id}</strong>
          </div>
        ))}
      </div>

      <div style={{ width: "70%", paddingLeft: 20 }}>
        {selectedOrder ? (
          <>
            <div
              style={{
                marginBottom: 20,
                position: "relative",
                border: "1px solid #ccc",
                padding: 10,
                borderRadius: 4,
              }}
            >
              <h3>{selectedOrder.title}</h3>
              <p>{selectedOrder.description}</p>
              <button
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  background: "red",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                Delete Order
              </button>
            </div>


            {/* Added JSX to show order details and edit form */}
            <div>
              <h2>{selectedOrder.title}</h2>
              <p><b>Author:</b> {selectedOrder.owner?.username || "Unknown"}</p>
              <p>{selectedOrder.description}</p>
              <p>
                <b>From:</b> {selectedOrder.start_date ? selectedOrder.start_date.slice(0, 10) : ""}{" "}
                <b>To:</b> {selectedOrder.end_date ? selectedOrder.end_date.slice(0, 10) : ""}
              </p>
              {!isEditingOrder && (
                <button onClick={() => startEditOrder(selectedOrder)}>Edit Order</button>
              )}
            </div>

            {isEditingOrder && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
                <h3>Edit Order</h3>
                <label>
                  Title:
                  <input
                    name="title"
                    value={editOrderData.title}
                    onChange={handleEditOrderChange}
                    placeholder="Title"
                    style={{ width: "100%" }}
                  />
                  {editOrderErrors.title && (
                    <small style={{ color: "red" }}>{editOrderErrors.title}</small>
                  )}
                  <small style={{ color: "#666" }}>
                    3-100 characters
                  </small>
                </label>

                <label>
                  Description:
                  <textarea
                    name="description"
                    value={editOrderData.description}
                    onChange={handleEditOrderChange}
                    placeholder="Description"
                    style={{ width: "100%" }}
                  />
                  {editOrderErrors.description && (
                    <small style={{ color: "red" }}>{editOrderErrors.description}</small>
                  )}
                  <small style={{ color: "#666" }}>
                    Max 1000 characters (optional)
                  </small>
                </label>

                <label>
                  Start Date:
                  <input
                    type="date"
                    name="start_date"
                    value={editOrderData.start_date}
                    onChange={handleEditOrderChange}
                    style={{ width: "100%" }}
                  />
                  {editOrderErrors.start_date && (
                    <small style={{ color: "red" }}>{editOrderErrors.start_date}</small>
                  )}
                </label>

                <label>
                  End Date:
                  <input
                    type="date"
                    name="end_date"
                    value={editOrderData.end_date}
                    onChange={handleEditOrderChange}
                    style={{ width: "100%" }}
                  />
                  {editOrderErrors.end_date && (
                    <small style={{ color: "red" }}>{editOrderErrors.end_date}</small>
                  )}
                </label>

                <label>
                  Status:
                  <select
                    name="status"
                    value={editOrderData.status}
                    onChange={handleEditOrderChange}
                    style={{ width: "100%" }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="canceled">Canceled</option>
                  </select>
                  {editOrderErrors.status && (
                    <small style={{ color: "red" }}>{editOrderErrors.status}</small>
                  )}
                </label>

                <div style={{ display: "flex", gap: 8 }}></div>
                  <button onClick={handleSaveOrder}>Save</button>
                  <button onClick={cancelEditOrder}>Cancel</button>
                </div>
            )}

            <h2>Messages</h2>
            <div
              style={{
                maxHeight: "60vh",
                overflowY: "auto",
                marginBottom: 10,
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    marginBottom: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#f4f4f4",
                    padding: "6px 10px",
                    borderRadius: 4,
                  }}
                >
                  <div>
                    <strong>{msg.sender?.username || "Unknown"}:</strong> {msg.content}
                  </div>
                  {msg.sender?.id === userId && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      style={{
                        marginLeft: 10,
                        background: "#e74c3c",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "2px 6px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <input
                placeholder="Type a message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ width: "80%", marginRight: 10 }}
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </>
        ) : (
          <p>Select an order to view messages</p>
        )}
      </div>
    </div>
  );
}

export default App;
