import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const socketUrl = "https://ludo-server-1.onrender.com/ludo-ws";

const stompClient = new Client({
  webSocketFactory: () => new SockJS(socketUrl),
  debug: (str) => console.log(str),
  reconnectDelay: 5000,
});

export default stompClient;
