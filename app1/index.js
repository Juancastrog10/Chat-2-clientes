const socket = io(); 
// Se conecta al servidor usando Socket.IO (WebSocket)

let username = "cliente1"; 
// Nombre predeterminado del usuario en este cliente

// Enviar solicitud HTTP POST al servidor para registrar el nombre
fetch("/register", {
  method: "POST", // Tipo de método HTTP
  headers: { "Content-Type": "application/json" }, // Indicamos que enviamos JSON
  body: JSON.stringify({ username }), // Convertimos el nombre en texto JSON
})
.then(res => res.json()) // Convertimos la respuesta a objeto JS
.then(data => {
  if (data.success) {
    socket.emit("register", username); 
    // Si el registro fue exitoso, le decimos al servidor por socket quién somos
  }
});

document.getElementById("username").value = username; 
// Muestra el nombre en el campo de entrada

// Obtenemos referencias a los elementos HTML
const userList = document.getElementById("usersOnline"); // Lista de usuarios conectados
const chatBox = document.getElementById("chatBox"); // Lista de mensajes en el chat
const toUserInput = document.getElementById("toUser"); // Campo para escribir a quién va el mensaje
const msgInput = document.getElementById("message"); // Campo para escribir el mensaje
const typingInfo = document.getElementById("typingInfo"); // Texto para mostrar "usuario está escribiendo"
const pingSound = document.getElementById("ping"); // Elemento de audio para sonido de nuevo mensaje

// Evento: cambiar nombre de usuario
document.getElementById("setName").addEventListener("click", () => {
  const newName = document.getElementById("username").value.trim(); // Tomamos el nuevo nombre del input
  if (newName && newName !== username) {
    socket.emit("changeUsername", newName); // Enviamos el nuevo nombre al servidor
    username = newName; // Lo actualizamos localmente
  }
});

// Evento: enviar mensaje
document.getElementById("send").addEventListener("click", () => {
  const msg = msgInput.value.trim(); // Obtenemos el mensaje escrito
  const to = toUserInput.value.trim(); // Obtenemos el nombre del destinatario

  if (!msg) return; // Si el mensaje está vacío, no hacemos nada

  if (to) {
    // Si hay destinatario → mensaje privado
    socket.emit("sendPrivateMessage", { to, message: msg }); // Lo enviamos al servidor
    appendMessage(`🔒 Tú → ${to}: ${msg}`, "self"); // Lo mostramos como mensaje propio
  } else {
    // Si no hay destinatario → mensaje público
    socket.emit("sendPublicMessage", msg); // Lo enviamos al servidor
    appendMessage(`🌍 Tú: ${msg}`, "self"); // Lo mostramos como mensaje propio
  }

  msgInput.value = ""; // Limpiamos el campo del mensaje
});

// Evento: detecta cuando el usuario está escribiendo
msgInput.addEventListener("input", () => {
  const to = toUserInput.value.trim(); // Verificamos si es privado o público
  socket.emit("typing", to || null); // Informamos al servidor que estamos escribiendo
});

// Evento: manejar todos los tipos de mensajes recibidos
socket.on("message", (data) => {
  switch (data.type) {
    case "public":
      // Si es un mensaje público y no lo mandé yo, lo muestro
      if (data.from !== username) {
        appendMessage(`${data.time} 🌍 ${data.from}: ${data.message}`, "other");
        pingSound.play(); // Sonido de notificación
      }
      break;

    case "private":
      // Si es mensaje privado y va dirigido a mí (pero no lo mandé yo), lo muestro
      if (data.to === username && data.from !== username) {
        appendMessage(`${data.time} 🔒 ${data.from}: ${data.message}`, "private");
        pingSound.play(); // Sonido de notificación
      }
      break;

    case "server":
      // Si es mensaje del servidor, lo mostramos como informativo
      appendMessage(`🟡 ${data.message}`, "info");
      break;

    case "typing":
      // Si alguien está escribiendo (para mí o públicamente)
      if (!data.to || data.to === username) {
        typingInfo.textContent = `${data.from} está escribiendo...`; // Mostrar texto
        clearTimeout(typingInfo.timeout); // Reiniciar temporizador
        typingInfo.timeout = setTimeout(() => {
          typingInfo.textContent = ""; // Quitar texto después de 2 segundos
        }, 2000);
      }
      break;
  }
});

// Evento: recibir y mostrar lista de usuarios conectados
socket.on("userList", (users) => {
  userList.innerHTML = ""; // Limpiamos la lista
  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user;
    li.style.color = getColorForUser(user); // Le damos un color a cada usuario
    userList.appendChild(li); // Lo agregamos a la lista
  });
});

// Función: agregar mensaje a la pantalla del chat
function appendMessage(text, type = "other") {
  const li = document.createElement("li");
  li.textContent = text;
  li.classList.add("message", type); // Tipo de mensaje: self, private, other, info
  chatBox.appendChild(li); // Lo agregamos al final del chat
  chatBox.scrollTop = chatBox.scrollHeight; // Scroll automático hacia abajo
}

// Función: asignar un color único a cada usuario según su nombre
function getColorForUser(name) {
  const colors = ["crimson", "teal", "purple", "darkgreen", "chocolate", "darkorange"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i); // Suma los valores de cada letra del nombre
  }
  return colors[hash % colors.length]; // Selecciona un color según el resultado
}
