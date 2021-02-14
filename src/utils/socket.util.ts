import { Server } from "socket.io";

export function removeRoom(server: Server, roomId: string) {
  server.to(roomId).clients((error: string, socketIds: string[]) => {
    if (error) throw new Error(error);
    for (const id of socketIds)
      this.server.sockets.sockets[id].leave(roomId);
  });
}