const express = require("express"); // Importa Express, el framework para crear el servidor web
const http = require("http"); // Importa el módulo HTTP para crear el servidor
const { Server } = require("socket.io"); // Importa la clase Server de Socket.IO
const path = require("path"); // Módulo de Node.js para manejar rutas de archivos

const app = express(); // Crea la aplicación Express
const server = http.createServer(app); // Crea el servidor HTTP con Express
const io = new Server(server); // Inicializa Socket.IO con el servidor

const users = {};      // Objeto para guardar usuarios conectados: username -> socket.id
const history = [];    // Arreglo para almacenar los mensajes enviados (historial)

// Sirve los archivos estáticos de las carpetas app1 y app2
app.use("/app1", express.static(path.join(__dirname, "app1")));
app.use("/app2", express.static(path.join(__dirname, "app2")));

// Evento que se dispara cuando un cliente se conecta
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado:", socket.id);

  // Evento cuando el cliente se registra con un nombre
  socket.on("register", (username) => {
    socket.username = username; // Guarda el nombre en el socket
    users[username] = socket.id; // Asocia el username con el ID de socket
    console.log(`${username} se registró`);

    // Reenvía todo el historial de mensajes a todos los clientes
    history.forEach((msg) => {
      io.emit("message", msg); // El cliente decidirá si mostrarlo o no
    });

    // Notifica a todos que el usuario se conectó
    io.emit("message", {
      type: "server",
      message: `${username} se ha conectado`,
      from: "server",
    });

    // Envía la lista de usuarios conectados
    io.emit("userList", Object.keys(users));
  });

  // Evento cuando se envía un mensaje público
  socket.on("sendPublicMessage", (text) => {
    const data = {
      type: "public",
      from: socket.username,
      to: null,
      message: text,
      time: new Date().toLocaleTimeString(),
    };
    history.push(data); // Guarda el mensaje en el historial
    io.emit("message", data); // Lo envía a todos los clientes
  });

  // Evento cuando se envía un mensaje privado
  socket.on("sendPrivateMessage", ({ to, message }) => {
    const data = {
      type: "private",
      from: socket.username,
      to,
      message,
      time: new Date().toLocaleTimeString(),
    };
    history.push(data); // Guarda el mensaje
    io.emit("message", data); // Lo envía a todos (el cliente filtrará si debe verlo)
  });

  // Evento cuando un usuario está escribiendo
  socket.on("typing", (toUser) => {
    const data = {
      type: "typing",
      from: socket.username,
      to: toUser || null, // null si está escribiendo en el chat público
    };
    io.emit("message", data); // Informa a todos que está escribiendo
  });

  // Evento para cambiar el nombre de usuario
  socket.on("changeUsername", (newName) => {
    const oldName = socket.username;

    if (users[newName]) {
      // Si ya existe ese nombre, notifica error
      io.emit("message", {
        type: "server",
        message: `Nombre "${newName}" ya está en uso.`,
        from: "server",
      });
    } else {
      // Si es válido, actualiza el nombre
      delete users[oldName]; // Borra el anterior
      users[newName] = socket.id; // Registra el nuevo
      socket.username = newName; // Actualiza en el socket

      // Notifica a todos del cambio de nombre
      io.emit("message", {
        type: "server",
        message: `${oldName} ahora se llama ${newName}`,
        from: "server",
      });

      io.emit("userList", Object.keys(users)); // Envía la nueva lista de usuarios
    }
  });

  // Evento cuando un usuario se desconecta
  socket.on("disconnect", () => {
    if (socket.username) {
      delete users[socket.username]; // Elimina el usuario del objeto users

      // Notifica la desconexión a todos los usuarios
      io.emit("message", {
        type: "server",
        message: `${socket.username} se ha desconectado`,
        from: "server",
      });

      io.emit("userList", Object.keys(users)); // Actualiza la lista de usuarios
    }
  });
});

// Inicia el servidor en el puerto 3000
server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000/app1 y /app2");
});
