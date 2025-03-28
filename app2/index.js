const socket = io(); 
// Se conecta al servidor a través de Socket.IO

let username = "cliente2"; 
// Nombre por defecto de este cliente

socket.emit("register", username); 
// Envía al servidor que este usuario se está registrando

document.getElementById("username").value = username; 
// Muestra el nombre en el campo de entrada

// Obtener elementos del DOM (interfaz)
const userList = document.getElementById("usersOnline");     // Lista de usuarios conectados
const chatBox = document.getElementById("chatBox");           // Donde se muestran los mensajes
const toUserInput = document.getElementById("toUser");        // Campo para escribir el destinatario
const msgInput = document.getElementById("message");          // Campo para escribir el mensaje
const typingInfo = document.getElementById("typingInfo");     // Indicador de "alguien está escribiendo"
const pingSound = document.getElementById("ping");            // Sonido para mensajes entrantes

// Cambiar nombre de usuario
document.getElementById("setName").addEventListener("click", () => {
  const newName = document.getElementById("username").value.trim(); // Toma el nuevo nombre del input
  if (newName && newName !== username) {
    socket.emit("changeUsername", newName); // Informa al servidor
    username = newName; // Actualiza el nombre localmente
  }
});

// Enviar mensaje (público o privado)
document.getElementById("send").addEventListener("click", () => {
  const msg = msgInput.value.trim();     // Contenido del mensaje
  const to = toUserInput.value.trim();   // Destinatario (puede ser vacío)

  if (!msg) return; // Si no hay mensaje, no hacer nada

  if (to) {
    // Si hay destinatario, enviar mensaje privado
    socket.emit("sendPrivateMessage", { to, message: msg });
    appendMessage(`🔒 Tú → ${to}: ${msg}`, "self"); // Mostrarlo en azul como mensaje propio
  } else {
    // Si no hay destinatario, es mensaje público
    socket.emit("sendPublicMessage", msg);
    appendMessage(`🌍 Tú: ${msg}`, "self");
  }

  msgInput.value = ""; // Limpiar el campo después de enviar
});

// Detectar que el usuario está escribiendo
msgInput.addEventListener("input", () => {
  const to = toUserInput.value.trim();
  socket.emit("typing", to || null); // Enviar al servidor a quién está escribiendo (o público)
});

// Escuchar todos los mensajes enviados desde el servidor
socket.on("message", (data) => {
  switch (data.type) {
    case "public":
      // Mostrar mensaje público solo si lo escribió otra persona
      if (data.from !== username) {
        appendMessage(`${data.time} 🌍 ${data.from}: ${data.message}`, "other");
        pingSound.play(); // Reproduce sonido
      }
      break;

    case "private":
      // Mostrar solo si el mensaje va dirigido a mí, y no es mío
      if (data.to === username && data.from !== username) {
        appendMessage(`${data.time} 🔒 ${data.from}: ${data.message}`, "private");
        pingSound.play();
      }
      break;

    case "server":
      // Mensajes del servidor (conexiones, cambios de nombre, etc.)
      appendMessage(`🟡 ${data.message}`, "info");
      break;

    case "typing":
      // Mostrar "está escribiendo..." si es para mí o es público
      if (!data.to || data.to === username) {
        typingInfo.textContent = `${data.from} está escribiendo...`;
        clearTimeout(typingInfo.timeout); // Reiniciar temporizador si sigue escribiendo
        typingInfo.timeout = setTimeout(() => {
          typingInfo.textContent = "";    // Borrar después de 2 segundos
        }, 2000);
      }
      break;
  }
});

// Actualiza la lista de usuarios conectados
socket.on("userList", (users) => {
  userList.innerHTML = ""; // Vaciar lista actual
  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user;
    li.style.color = getColorForUser(user); // Colores personalizados por nombre
    userList.appendChild(li);
  });
});

// Función para agregar mensajes al chat
function appendMessage(text, type = "other") {
  const li = document.createElement("li");
  li.textContent = text;
  li.classList.add("message", type); // Tipo: self, private, info, other
  chatBox.appendChild(li);
  chatBox.scrollTop = chatBox.scrollHeight; // Baja automáticamente al final del chat
}

// Función que asigna un color distinto a cada usuario según su nombre
function getColorForUser(name) {
  const colors = ["crimson", "teal", "purple", "darkgreen", "chocolate", "darkorange"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i); // Suma el valor ASCII de cada letra del nombre
  }
  return colors[hash % colors.length]; // Devuelve un color de la lista
}
