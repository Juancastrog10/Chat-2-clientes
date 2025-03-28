const socket = io();
let username = "cliente1";

fetch("/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username }),
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    socket.emit("register", username);
  }
});

document.getElementById("username").value = username;

const userList = document.getElementById("usersOnline");
const chatBox = document.getElementById("chatBox");
const toUserInput = document.getElementById("toUser");
const msgInput = document.getElementById("message");
const typingInfo = document.getElementById("typingInfo");
const pingSound = document.getElementById("ping");

document.getElementById("setName").addEventListener("click", () => {
  const newName = document.getElementById("username").value.trim();
  if (newName && newName !== username) {
    socket.emit("changeUsername", newName);
    username = newName;
  }
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
