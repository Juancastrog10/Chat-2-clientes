const socket = io();
let username = null;

const registerScreen = document.getElementById("registerScreen");
const chatScreen = document.getElementById("chatScreen");

const registerBtn = document.getElementById("registerBtn");
const usernameInput = document.getElementById("username");

const userList = document.getElementById("usersOnline");
const chatBox = document.getElementById("chatBox");
const toUserInput = document.getElementById("toUser");
const msgInput = document.getElementById("message");
const typingInfo = document.getElementById("typingInfo");
const pingSound = document.getElementById("ping");

registerBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Debes ingresar un nombre");

  fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: name }),
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      username = name;
      socket.emit("register", username);
      registerScreen.style.display = "none";
      chatScreen.style.display = "block";
    } else {
      alert("Nombre no válido o en uso");
    }
  });
});

document.getElementById("send").addEventListener("click", () => {
  const msg = msgInput.value.trim();
  const to = toUserInput.value.trim();
  if (!msg) return;

  if (to) {
    socket.emit("sendPrivateMessage", { to, message: msg });
    appendMessage(`🔒 Tú → ${to}: ${msg}`, "self");
  } else {
    socket.emit("sendPublicMessage", msg);
    appendMessage(`🌍 Tú: ${msg}`, "self");
  }

  msgInput.value = "";
});

msgInput.addEventListener("input", () => {
  const to = toUserInput.value.trim();
  socket.emit("typing", to || null);
});

socket.on("message", (data) => {
  switch (data.type) {
    case "public":
      if (data.from !== username) {
        appendMessage(`${data.time} 🌍 ${data.from}: ${data.message}`, "other");
        pingSound.play();
      }
      break;
    case "private":
      if (data.to === username && data.from !== username) {
        appendMessage(`${data.time} 🔒 ${data.from}: ${data.message}`, "private");
        pingSound.play();
      }
      break;
    case "server":
      appendMessage(`🟡 ${data.message}`, "info");
      break;
    case "typing":
      if (!data.to || data.to === username) {
        typingInfo.textContent = `${data.from} está escribiendo...`;
        clearTimeout(typingInfo.timeout);
        typingInfo.timeout = setTimeout(() => {
          typingInfo.textContent = "";
        }, 2000);
      }
      break;
  }
});

socket.on("userList", (users) => {
  userList.innerHTML = "";
  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user;
    li.style.color = getColorForUser(user);
    userList.appendChild(li);
  });
});

function appendMessage(text, type = "other") {
  const li = document.createElement("li");
  li.textContent = text;
  li.classList.add("message", type);
  chatBox.appendChild(li);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function getColorForUser(name) {
  const colors = ["crimson", "teal", "purple", "darkgreen", "chocolate", "darkorange"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i);
  }
  return colors[hash % colors.length];
}
