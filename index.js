const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json()); // Para poder leer JSON en las peticiones POST

const users = {};      // username -> socket.id
const history = [];    // historial de mensajes (opcional)

// ENDPOINT HTTP: registro por POST
app.post("/register", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Nombre de usuario requerido" });
  }
  console.log(`Usuario ${username} registrado vía HTTP`);
  res.status(200).json({ success: true });
});

// Servir clientes
app.use("/app1", express.static(path.join(__dirname, "app1")));
app.use("/app2", express.static(path.join(__dirname, "app2")));

io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado:", socket.id);

  socket.on("register", (username) => {
    socket.username = username;
    users[username] = socket.id;

    history.forEach((msg) => {
      io.emit("message", msg);
    });

    io.emit("message", {
      type: "server",
      message: `${username} se ha conectado`,
      from: "server",
    });

    io.emit("userList", Object.keys(users));
  });

  socket.on("sendPublicMessage", (text) => {
    const data = {
      type: "public",
      from: socket.username,
      to: null,
      message: text,
      time: new Date().toLocaleTimeString(),
    };
    history.push(data);
    io.emit("message", data);
  });

  socket.on("sendPrivateMessage", ({ to, message }) => {
    const data = {
      type: "private",
      from: socket.username,
      to,
      message,
      time: new Date().toLocaleTimeString(),
    };
    history.push(data);
    io.emit("message", data);
  });

  socket.on("typing", (toUser) => {
    const data = {
      type: "typing",
      from: socket.username,
      to: toUser || null,
    };
    io.emit("message", data);
  });

  socket.on("changeUsername", (newName) => {
    const oldName = socket.username;

    if (users[newName]) {
      io.emit("message", {
        type: "server",
        message: `Nombre "${newName}" ya está en uso.`,
        from: "server",
      });
    } else {
      delete users[oldName];
      users[newName] = socket.id;
      socket.username = newName;

      io.emit("message", {
        type: "server",
        message: `${oldName} ahora se llama ${newName}`,
        from: "server",
      });

      io.emit("userList", Object.keys(users));
    }
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      delete users[socket.username];
      io.emit("message", {
        type: "server",
        message: `${socket.username} se ha desconectado`,
        from: "server",
      });
      io.emit("userList", Object.keys(users));
    }
  });
});

server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000/app1 y /app2");
});
