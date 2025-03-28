const socket = io(); 
// Se conecta al servidor usando Socket.IO

let username = "cliente1"; 
// Nombre inicial del usuario (se puede cambiar más adelante)

socket.emit("register", username); 
// Envia al servidor que este cliente se está registrando con ese nombre

document.getElementById("username").value = username; 
// Muestra el nombre en el campo de entrada de texto

// Obtener referencias a los elementos del DOM
const userList = document.getElementById("usersOnline");       // Lista de usuarios conectados
const chatBox = document.getElementById("chatBox");            // Lista de mensajes del chat
const toUserInput = document.getElementById("toUser");         // Campo para indicar a quién va dirigido el mensaje
const msgInput = document.getElementById("message");           // Campo para escribir el mensaje
const typingInfo = document.getElementById("typingInfo");      // Área donde aparece "usuario está escribiendo"
const pingSound = document.getElementById("ping");             // Sonido que suena al recibir mensaje

// Botón para actualizar nombre de usuario
document.getElementById("setName").addEventListener("click", () => {
  const newName = document.getElementById("username").value.trim(); // Toma el nuevo nombre del input
  if (newName && newName !== username) { 
    socket.emit("changeUsername", newName); // Informa al servidor del nuevo nombre
    username = newName; // Actualiza el nombre localmente
  }
});

// Botón para enviar un mensaje
document.getElementById("send").addEventListener("click", () => {
  const msg = msgInput.value.trim();         // Contenido del mensaje
  const to = toUserInput.value.trim();       // Destinatario (puede estar vacío)

  if (!msg) return; // No hace nada si el mensaje está vacío

  if (to) {
    // Si hay destinatario → mensaje privado
    socket.emit("sendPrivateMessage", { to, message: msg }); // Enviar al servidor
    appendMessage(`🔒 Tú → ${to}: ${msg}`, "self"); // Mostrarlo inmediatamente como emisor
  } else {
    // Si no hay destinatario → mensaje público
    socket.emit("sendPublicMessage", msg);
    appendMessage(`🌍 Tú: ${msg}`, "self");
  }

  msgInput.value = ""; // Limpiar el campo de mensaje después de enviar
});

// Detectar si el usuario está escribiendo
msgInput.addEventListener("input", () => {
  const to = toUserInput.value.trim(); // Verifica si el usuario está escribiendo a alguien específico
  socket.emit("typing", to || null);   // Enviar al servidor que está escribiendo (privado o público)
});

// Escuchar todos los mensajes que el servidor emite
socket.on("message", (data) => {
  switch (data.type) {
    case "public":
      // Mensaje público de otro usuario (no mostrar si lo mandaste tú)
      if (data.from !== username) {
        appendMessage(`${data.time} 🌍 ${data.from}: ${data.message}`, "other");
        pingSound.play(); // Suena al recibir mensaje
      }
      break;

    case "private":
      // Mensaje privado → solo mostrar si yo soy el receptor
      if (data.to === username && data.from !== username) {
        appendMessage(`${data.time} 🔒 ${data.from}: ${data.message}`, "private");
        pingSound.play();
      }
      break;

    case "server":
      // Mensaje generado por el servidor (como "usuario se conectó")
      appendMessage(`🟡 ${data.message}`, "info");
      break;

    case "typing":
      // Si alguien está escribiendo (y soy el destinatario o es mensaje público)
      if (!data.to || data.to === username) {
        typingInfo.textContent = `${data.from} está escribiendo...`;
        clearTimeout(typingInfo.timeout); // Reinicia temporizador si alguien sigue escribiendo
        typingInfo.timeout = setTimeout(() => {
          typingInfo.textContent = "";    // Borra el mensaje después de 2 segundos
        }, 2000);
      }
      break;

    default:
      // Si llega algo que no tiene tipo definido, lo ignora
      break;
  }
});

// Actualiza la lista de usuarios conectados
socket.on("userList", (users) => {
  userList.innerHTML = ""; // Limpia la lista
  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user; 
    li.style.color = getColorForUser(user); // Aplica un color personalizado por usuario
    userList.appendChild(li); // Lo agrega a la lista
  });
});

// Función para agregar mensajes al chat
function appendMessage(text, type = "other") {
  const li = document.createElement("li");
  li.textContent = text;
  li.classList.add("message", type); // Le agrega una clase para estilos (self, private, info, other)
  chatBox.appendChild(li);
  chatBox.scrollTop = chatBox.scrollHeight; // Baja el scroll automáticamente al final del chat
}

// Función que asigna un color según el nombre de usuario
function getColorForUser(name) {
  const colors = ["crimson", "teal", "purple", "darkgreen", "chocolate", "darkorange"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i); // Suma el valor ASCII de cada letra del nombre
  }
  return colors[hash % colors.length]; // Devuelve un color de la lista, según el resultado
}
