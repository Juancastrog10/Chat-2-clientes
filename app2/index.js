const socket = io(); 
// Se conecta al servidor usando Socket.IO

let username = null;
// Variable para guardar el nombre de usuario

// Referencias a los elementos HTML del DOM
const registerScreen = document.getElementById("registerScreen"); // Pantalla de registro
const chatScreen = document.getElementById("chatScreen");         // Pantalla del chat

const registerBtn = document.getElementById("registerBtn");       // Botón para registrarse
const usernameInput = document.getElementById("username");        // Input para escribir el nombre

const userList = document.getElementById("usersOnline");          // Lista de usuarios conectados
const chatBox = document.getElementById("chatBox");               // Caja de mensajes
const toUserInput = document.getElementById("toUser");            // Campo para escribir a quién se le manda (opcional)
const msgInput = document.getElementById("message");              // Campo del mensaje
const typingInfo = document.getElementById("typingInfo");         // Texto "alguien está escribiendo..."
const pingSound = document.getElementById("ping");                // Sonido para notificar mensaje nuevo

// Evento cuando el usuario hace clic en "Entrar"
registerBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim(); // Obtenemos el nombre
  if (!name) return alert("Debes ingresar un nombre"); // Validación

  // Enviamos el nombre al servidor por HTTP (POST)
  fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: name }), // Enviamos el nombre como JSON
  })
  .then(res => res.json()) // Convertimos la respuesta en JSON
  .then(data => {
    if (data.success) {
      username = name; // Guardamos el nombre localmente
      socket.emit("register", username); // Registramos vía WebSocket
      registerScreen.style.display = "none"; // Ocultamos la pantalla de registro
      chatScreen.style.display = "block"; // Mostramos el chat
    } else {
      alert("Nombre no válido o en uso"); // Si el nombre ya existe
    }
  });
});

// Evento cuando se hace clic en "Enviar"
document.getElementById("send").addEventListener("click", () => {
  const msg = msgInput.value.trim(); // Obtenemos el mensaje
  const to = toUserInput.value.trim(); // Obtenemos el destinatario (si hay)

  if (!msg) return; // No enviar mensajes vacíos

  if (to) {
    // Si hay destinatario → mensaje privado
    socket.emit("sendPrivateMessage", { to, message: msg });
    appendMessage(`🔒 Tú → ${to}: ${msg}`, "self");
  } else {
    // Si no hay destinatario → mensaje público
    socket.emit("sendPublicMessage", msg);
    appendMessage(`🌍 Tú: ${msg}`, "self");
  }

  msgInput.value = ""; // Limpiamos el campo del mensaje
});

// Evento cuando el usuario escribe (para mostrar "está escribiendo")
msgInput.addEventListener("input", () => {
  const to = toUserInput.value.trim(); // A quién le está escribiendo (opcional)
  socket.emit("typing", to || null); // Enviamos evento de escritura
});

// Escuchamos los mensajes que llegan desde el servidor
socket.on("message", (data) => {
  switch (data.type) {
    case "public":
      // Si es un mensaje público y no lo escribí yo
      if (data.from !== username) {
        appendMessage(`${data.time} 🌍 ${data.from}: ${data.message}`, "other");
        pingSound.play(); // Sonido
      }
      break;

    case "private":
      // Si es privado y va dirigido a mí, y no lo escribí yo
      if (data.to === username && data.from !== username) {
        appendMessage(`${data.time} 🔒 ${data.from}: ${data.message}`, "private");
        pingSound.play(); // Sonido
      }
      break;

    case "server":
      // Mensaje informativo del servidor (conexiones, desconexiones, cambios de nombre)
      appendMessage(`🟡 ${data.message}`, "info");
      break;

    case "typing":
      // Mostrar que alguien está escribiendo (si es público o me lo escribe a mí)
      if (!data.to || data.to === username) {
        typingInfo.textContent = `${data.from} está escribiendo...`;
        clearTimeout(typingInfo.timeout); // Limpiar mensaje anterior
        typingInfo.timeout = setTimeout(() => {
          typingInfo.textContent = ""; // Borrar después de 2 segundos
        }, 2000);
      }
      break;
  }
});

// Recibimos lista de usuarios y la mostramos
socket.on("userList", (users) => {
  userList.innerHTML = ""; // Limpiar lista actual
  users.forEach(user => {
    const li = document.createElement("li"); // Crear elemento de lista
    li.textContent = user; // Mostrar nombre
    li.style.color = getColorForUser(user); // Asignar color
    userList.appendChild(li); // Agregar al DOM
  });
});

// Agrega un mensaje al chat
function appendMessage(text, type = "other") {
  const li = document.createElement("li");
  li.textContent = text;
  li.classList.add("message", type); // Asignamos clase según tipo de mensaje
  chatBox.appendChild(li); // Agregar a la caja de mensajes
  chatBox.scrollTop = chatBox.scrollHeight; // Hacer scroll hacia abajo
}

// Asigna un color a cada usuario usando su nombre
function getColorForUser(name) {
  const colors = ["crimson", "teal", "purple", "darkgreen", "chocolate", "darkorange"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i); // Suma los códigos de cada letra del nombre
  }
  return colors[hash % colors.length]; // Selecciona un color usando el resultado
}
