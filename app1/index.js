const socket = io(); // Se conecta al servidor mediante Socket.IO

let username = null; // Aquí se guardará el nombre de usuario una vez ingresado

// Referencias a los elementos del DOM (HTML)
const registerScreen = document.getElementById("registerScreen"); // Pantalla para ingresar nombre
const chatScreen = document.getElementById("chatScreen"); // Pantalla principal del chat

const registerBtn = document.getElementById("registerBtn"); // Botón de "Entrar"
const usernameInput = document.getElementById("username"); // Campo para ingresar el nombre

const userList = document.getElementById("usersOnline"); // Lista de usuarios conectados
const chatBox = document.getElementById("chatBox"); // Lista de mensajes del chat
const toUserInput = document.getElementById("toUser"); // Campo para indicar destinatario (mensaje privado)
const msgInput = document.getElementById("message"); // Campo de texto para escribir el mensaje
const typingInfo = document.getElementById("typingInfo"); // Texto que muestra quién está escribiendo
const pingSound = document.getElementById("ping"); // Sonido que se reproduce cuando llega un mensaje

// Cuando el usuario hace clic en "Entrar"
registerBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim(); // Obtiene el nombre escrito
  if (!name) return alert("Debes ingresar un nombre"); // Si no escribió nada, se muestra una alerta

  // Se envía el nombre al servidor usando HTTP POST
  fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: name }), // Enviamos el nombre como JSON
  })
  .then(res => res.json()) // Convertimos la respuesta a JSON
  .then(data => {
    if (data.success) {
      username = name; // Guardamos el nombre localmente
      socket.emit("register", username); // Enviamos el nombre al servidor por WebSocket
      registerScreen.style.display = "none"; // Ocultamos la pantalla de registro
      chatScreen.style.display = "block"; // Mostramos la pantalla del chat
    } else {
      alert("Nombre no válido o en uso"); // Si hubo error, mostramos alerta
    }
  });
});

// Cuando el usuario hace clic en el botón "Enviar"
document.getElementById("send").addEventListener("click", () => {
  const msg = msgInput.value.trim(); // Obtenemos el mensaje
  const to = toUserInput.value.trim(); // Obtenemos el destinatario (si hay)

  if (!msg) return; // Si el mensaje está vacío, no hace nada

  if (to) {
    // Si hay destinatario, enviamos un mensaje privado
    socket.emit("sendPrivateMessage", { to, message: msg });
    appendMessage(`🔒 Tú → ${to}: ${msg}`, "self"); // Mostramos el mensaje como propio
  } else {
    // Si no hay destinatario, enviamos un mensaje público
    socket.emit("sendPublicMessage", msg);
    appendMessage(`🌍 Tú: ${msg}`, "self"); // Mostramos el mensaje como propio
  }

  msgInput.value = ""; // Limpiamos el campo de texto
});

// Cuando el usuario está escribiendo en el input de mensaje
msgInput.addEventListener("input", () => {
  const to = toUserInput.value.trim(); // Verificamos si está escribiendo a alguien
  socket.emit("typing", to || null); // Enviamos evento de "está escribiendo"
});

// Escuchamos todos los mensajes que el servidor emite
socket.on("message", (data) => {
  switch (data.type) {
    case "public":
      // Si es un mensaje público de otro usuario
      if (data.from !== username) {
        appendMessage(`${data.time} 🌍 ${data.from}: ${data.message}`, "other");
        pingSound.play(); // Reproducimos sonido
      }
      break;

    case "private":
      // Si es un mensaje privado dirigido a este usuario
      if (data.to === username && data.from !== username) {
        appendMessage(`${data.time} 🔒 ${data.from}: ${data.message}`, "private");
        pingSound.play(); // Reproducimos sonido
      }
      break;

    case "server":
      // Si es un mensaje del servidor (ej. alguien se conectó o cambió nombre)
      appendMessage(`🟡 ${data.message}`, "info");
      break;

    case "typing":
      // Si alguien está escribiendo (públicamente o para este usuario)
      if (!data.to || data.to === username) {
        typingInfo.textContent = `${data.from} está escribiendo...`;
        clearTimeout(typingInfo.timeout); // Limpiamos el anterior timeout si existe
        typingInfo.timeout = setTimeout(() => {
          typingInfo.textContent = ""; // Quitamos el mensaje después de 2 segundos
        }, 2000);
      }
      break;
  }
});

// Recibimos la lista de usuarios conectados
socket.on("userList", (users) => {
  userList.innerHTML = ""; // Limpiamos la lista actual
  users.forEach(user => {
    const li = document.createElement("li"); // Creamos un elemento <li>
    li.textContent = user; // Le ponemos el nombre del usuario
    li.style.color = getColorForUser(user); // Le asignamos un color personalizado
    userList.appendChild(li); // Lo agregamos a la lista del DOM
  });
});

// Función para mostrar un mensaje en el chat
function appendMessage(text, type = "other") {
  const li = document.createElement("li"); // Creamos un nuevo elemento <li>
  li.textContent = text; // Le asignamos el contenido del mensaje
  li.classList.add("message", type); // Le damos una clase según el tipo de mensaje
  chatBox.appendChild(li); // Lo agregamos a la caja de chat
  chatBox.scrollTop = chatBox.scrollHeight; // Hacemos scroll automático hacia abajo
}

// Función para asignar un color único a cada usuario
function getColorForUser(name) {
  const colors = ["crimson", "teal", "purple", "darkgreen", "chocolate", "darkorange"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i); // Sumamos el valor ASCII de cada letra del nombre
  }
  return colors[hash % colors.length]; // Devolvemos un color basado en el resultado
}
