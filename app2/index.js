const socket = io(); 
// Se conecta al servidor en tiempo real usando Socket.IO

let username = "cliente2"; 
// Establece el nombre predeterminado del usuario como "cliente2"

// Hace una petición HTTP POST al servidor para registrar el usuario
fetch("/register", {
  method: "POST", // Método HTTP POST
  headers: { "Content-Type": "application/json" }, // Indicamos que se envía JSON
  body: JSON.stringify({ username }), // Convertimos el nombre en texto JSON
})
.then(res => res.json()) // Convertimos la respuesta en objeto JS
.then(data => {
  if (data.success) {
    socket.emit("register", username); 
    // Si el registro fue exitoso, avisamos al servidor vía socket quién somos
  }
});

document.getElementById("username").value = username; 
// Muestra el nombre actual en el input del formulario

// Obtenemos referencias a los elementos del DOM
const userList = document.getElementById("usersOnline"); // Lista de usuarios en línea
const chatBox = document.getElementById("chatBox"); // Lista de mensajes
const toUserInput = document.getElementById("toUser"); // Campo para escribir destinatario
const msgInput = document.getElementById("message"); // Campo para escribir el mensaje
const typingInfo = document.getElementById("typingInfo"); // Texto "está escribiendo..."
const pingSound = document.getElementById("ping"); // Sonido para mensajes nuevos

// Botón para cambiar el nombre de usuario
document.getElementById("setName").addEventListener("click", () => {
  const newName = document.getElementById("username").value.trim(); // Toma el nuevo nombre
  if (newName && newName !== username) {
    socket.emit("changeUsername", newName); // Envía el cambio al servidor
    username = newName; // Actualiza el nombre localmente
  }
});

// Botón para enviar mensaje
document.getElementById("send").addEventListener("click", () => {
  const msg = msgInput.value.trim(); // Obtiene el mensaje
  const to = toUserInput.value.trim(); // Obtiene el destinatario

  if (!msg) return; // Si el mensaje está vacío, no hace nada

  if (to) {
    // Si hay destinatario, es mensaje privado
    socket.emit("sendPrivateMessage", { to, message: msg }); // Enviar mensaje al servidor
    appendMessage(`🔒 Tú → ${to}: ${msg}`, "self"); // Mostrarlo como mensaje propio
  } else {
    // Si no hay destinatario, es mensaje público
    socket.emit("sendPublicMessage", msg); // Enviar al servidor
    appendMessage(`🌍 Tú: ${msg}`, "self"); // Mostrar como propio
  }

  msgInput.value = ""; // Limpiar el campo del mensaje
});

// Detecta cuando el usuario está escribiendo
msgInput.addEventListener("input", () => {
  const to = toUserInput.value.trim(); // A quién está escribiendo
  socket.emit("typing", to || null); // Avisar al servidor que estoy escribiendo
});

// Recibe cualquier tipo de mensaje del servidor
socket.on("message", (data) => {
  switch (data.type) {
    case "public":
      // Si el mensaje es público y no lo escribí yo
      if (data.from !== username) {
        appendMessage(`${data.time} 🌍 ${data.from}: ${data.message}`, "other");
        pingSound.play(); // Reproducir sonido
      }
      break;

    case "private":
      // Si el mensaje es privado y yo soy el destinatario (pero no el emisor)
      if (data.to === username && data.from !== username) {
        appendMessage(`${data.time} 🔒 ${data.from}: ${data.message}`, "private");
        pingSound.play(); // Reproducir sonido
      }
      break;

    case "server":
      // Mensajes del servidor (ej. usuarios conectados, nombres cambiados)
      appendMessage(`🟡 ${data.message}`, "info");
      break;

    case "typing":
      // Mostrar "está escribiendo..." si soy el destinatario o es público
      if (!data.to || data.to === username) {
        typingInfo.textContent = `${data.from} está escribiendo...`;
        clearTimeout(typingInfo.timeout); // Limpiar tiempo anterior
        typingInfo.timeout = setTimeout(() => {
          typingInfo.textContent = ""; // Ocultar después de 2 segundos
        }, 2000);
      }
      break;
  }
});

// Recibe lista de usuarios conectados y los muestra
socket.on("userList", (users) => {
  userList.innerHTML = ""; // Vacía la lista actual
  users.forEach(user => {
    const li = document.createElement("li"); // Crea un elemento de lista
    li.textContent = user; // Muestra el nombre del usuario
    li.style.color = getColorForUser(user); // Aplica un color según el nombre
    userList.appendChild(li); // Agrega el usuario a la lista en pantalla
  });
});

// Muestra un mensaje en la caja de chat
function appendMessage(text, type = "other") {
  const li = document.createElement("li"); // Crea un nuevo <li>
  li.textContent = text; // Le pone el texto del mensaje
  li.classList.add("message", type); // Le aplica la clase según el tipo (self, private, other, info)
  chatBox.appendChild(li); // Lo agrega al final del chat
  chatBox.scrollTop = chatBox.scrollHeight; // Baja el scroll automáticamente
}

// Devuelve un color único basado en el nombre del usuario
function getColorForUser(name) {
  const colors = ["crimson", "teal", "purple", "darkgreen", "chocolate", "darkorange"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i); // Suma los valores ASCII de cada letra
  }
  return colors[hash % colors.length]; // Selecciona un color de la lista según el resultado
}
