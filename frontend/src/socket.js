import { io } from "socket.io-client";

const BASE_URL =
  import.meta.env.VITE_API_URL || "https://smart-attendance-gsm7.onrender.com";

const socket = io(BASE_URL, {
  path: "/socket.io",
  transports: ["websocket"],
  withCredentials: true,
  autoConnect: false,
});

export default socket;
