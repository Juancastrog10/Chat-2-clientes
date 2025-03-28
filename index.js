const express = require("express"); // Importa el framework Express para crear el servidor web
const http = require("http"); // Importa el módulo HTTP nativo de Node.js
const { Server } = require("socket.io"); // Importa la clase Server de Socket.IO para usar WebSockets
const path = require("path"); // Módulo de Node.js para trabajar con rutas de archivos

const app = express(); // Crea una instancia de una aplicación Express
const server = http.createServer(app); // Crea un servidor HTTP basado en Express
const io = new Server(server); // Crea un servidor WebSocket usando Socket.IO sobre ese servidor HTTP

app.use(express.json()); // Middleware de Express para interpretar el cuerpo de las solicitudes como JSON

const users = {}; // Objeto para almacenar los usuarios conectados (username -> socket.id)
const history = []; // Arreglo para guardar el historial de mensajes

// Endpoint HTTP tipo POST para registrar un usuario antes de usar WebSocket
app.post("/register", (req, res) => {
  const { username } = req.body; // Extrae el username del cuerpo de la solicitud
  if (!username) {
    return res.status(400).json({ error: "Nombre de usuario requerido" }); // Si falta el nombre, se devuelve error
  }
  console.log(`Usuario ${username} registrado vía HTTP`); // Muestra en consola que el usuario se registró
  res.status(200).json({ success: true }); // Responde al cliente que el registro fue exitoso
});

// Servir archivos estáticos para los clientes
app.use("/app1", express.static(path.join(__dirname, "app1"))); // Cliente 1
app.use("/app2", express.static(path.join(__dirname, "app2"))); // Cliente 2

// Evento que ocurre cuando un cliente se conecta vía WebSocket
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado:", socket.id); // Muestra el ID del socket conectado

  // Evento personalizado para registrar el nombre de usuario
  socket.on("register", (username) => {
    socket.username = username; // Se guarda el nombre en la conexión del socket
    users[username] = socket.id; // Se almacena el socket ID con el nombre como clave

    // Se reenvía todo el historial de mensajes (el cliente decide si los muestra o no)
    history.forEach((msg) => {
      io.emit("message", msg);
    });

    // Se emite un mensaje de sistema a todos indicando que alguien se conectó
    io.emit("message", {
      type: "server",
      message: `${username} se ha conectado`,
      from: "server",
    });

    // Se envía la lista actualizada de usuarios conectados a todos los clientes
    io.emit("userList", Object.keys(users));
  });

  // Evento para manejar mensajes públicos
  socket.on("sendPublicMessage", (text) => {
    const data = {
      type: "public", // Tipo de mensaje
      from: socket.username, // Quién lo envió
      to: null, // Es público, no tiene destinatario
      message: text, // Contenido del mensaje
      time: new Date().toLocaleTimeString(), // Hora del mensaje
    };
    history.push(data); // Se guarda en el historial
    io.emit("message", data); // Se envía a todos los clientes
  });

  // Evento para manejar mensajes privados
  socket.on("sendPrivateMessage", ({ to, message }) => {
    const data = {
      type: "private", // Tipo de mensaje
      from: socket.username, // Quién lo envió
      to, // A quién va dirigido
      message, // Contenido
      time: new Date().toLocaleTimeString(), // Hora
    };
    history.push(data); // Se guarda en el historial
    io.emit("message", data); // Se emite globalmente, los clientes filtran si lo muestran
  });

  // Evento para detectar que un usuario está escribiendo
  socket.on("typing", (toUser) => {
    const data = {
      type: "typing", // Tipo de evento
      from: socket.username, // Quién está escribiendo
      to: toUser || null, // A quién le escribe (o null si es público)
    };
    io.emit("message", data); // Se emite a todos
  });

  // Evento para cambiar el nombre de usuario
  socket.on("changeUsername", (newName) => {
    const oldName = socket.username;

    // Si el nombre ya está en uso, se informa al cliente
    if (users[newName]) {
      io.emit("message", {
        type: "server",
        message: `Nombre "${newName}" ya está en uso.`,
        from: "server",
      });
    } else {
      // Si el nombre es válido, se actualiza
      delete users[oldName]; // Borra el nombre anterior
      users[newName] = socket.id; // Asocia el nuevo nombre
      socket.username = newName; // Actualiza el nombre en el socket

      io.emit("message", {
        type: "server",
        message: `${oldName} ahora se llama ${newName}`,
        from: "server",
      });

      io.emit("userList", Object.keys(users)); // Se actualiza la lista de usuarios
    }
  });

  // Evento que ocurre cuando un cliente se desconecta
  socket.on("disconnect", () => {
    if (socket.username) {
      delete users[socket.username]; // Se elimina el usuario del objeto
      io.emit("message", {
        type: "server",
        message: `${socket.username} se ha desconectado`,
        from: "server",
      });
      io.emit("userList", Object.keys(users)); // Se actualiza la lista de usuarios conectados
    }
  });
});

// Inicia el servidor en el puerto 3000
server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000/app1 y /app2");
});
