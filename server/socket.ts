import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UsersRepo, StoreRepo, StoreSubscription } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'shoppos_production_jwt_secret_key_884920';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);
        if (allowedOriginsEnv && allowedOriginsEnv !== '*') {
          const list = allowedOriginsEnv.split(',').map((s) => s.trim());
          if (list.includes(origin)) return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },
    transports: ['websocket', 'polling'],
  });

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]) ||
        socket.handshake.query?.token;

      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication required: No bearer token provided'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id || decoded.userId || decoded.sub;
      if (!userId) {
        return next(new Error('Invalid token: User ID missing'));
      }

      const user = await UsersRepo.findById(userId);
      if (!user) {
        return next(new Error('User account not found'));
      }

      if (user.status === 'suspended') {
        return next(new Error('User account is suspended'));
      }

      const isPlatformAdmin = user.role === 'SuperAdmin' || user.role === 'Admin';
      if (!isPlatformAdmin) {
        const store = await StoreRepo.getStore(user.storeId);
        if (!store) {
          return next(new Error('Store not found'));
        }
      }

      socket.data.user = user;
      socket.data.storeId = user.storeId || 'platform';
      socket.data.isAdmin = isPlatformAdmin;
      next();
    } catch {
      next(new Error('Authentication failed: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const storeId = socket.data.storeId;
    const isPlatformAdmin = socket.data.isAdmin;
    const userId = socket.data.user?._id;

    if (userId) {
      socket.join(`user_${userId}`);
    }

    if (isPlatformAdmin) {
      socket.join('admin_room');
      console.log(
        `[Socket.IO] Admin connected: ${socket.id} (User: ${socket.data.user?.name}) -> Joined admin_room & user_${userId}`
      );
      socket.emit('CONNECTED_TO_ADMIN', {
        adminId: socket.data.user?._id,
        connectedAt: new Date().toISOString(),
      });
    }

    if (storeId && storeId !== 'platform') {
      const room = `store_${storeId}`;
      socket.join(room);
      console.log(
        `[Socket.IO] Client connected: ${socket.id} (User: ${socket.data.user?.name}, Store: ${storeId}) -> Joined ${room} & user_${userId}`
      );
      socket.emit('CONNECTED_TO_STORE', {
        storeId,
        room,
        connectedAt: new Date().toISOString(),
      });
    }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

// ---------------- Realtime Emitters (Scoped to Store Room, User Room & Admin Room) ----------------

export function emitToAdmin(event: string, payload?: any) {
  if (!io) return;
  io.to('admin_room').emit(event, {
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

export function emitToStore(storeId: string, event: string, payload?: any) {
  if (!io) return;
  io.to(`store_${storeId}`).emit(event, {
    event,
    storeId,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

export function emitToUser(userId: string, event: string, payload?: any) {
  if (!io) return;
  io.to(`user_${userId}`).emit(event, {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

export function emitAccountSuspended(storeId: string, reason?: string) {
  console.log(`[Realtime Event] Emitting ACCOUNT_SUSPENDED to store_${storeId}`);
  emitToStore(storeId, 'ACCOUNT_SUSPENDED', {
    message: reason || 'Your account has been suspended. Please contact support.',
  });
  emitToAdmin('STORE_STATUS_CHANGED', { storeId, status: 'suspended', reason });

  // Force disconnect sockets belonging to this suspended store after delivering event
  setTimeout(() => {
    if (!io) return;
    io.in(`store_${storeId}`).fetchSockets().then((sockets) => {
      sockets.forEach((s) => {
        if (!s.data?.isAdmin) {
          s.disconnect(true);
        }
      });
    }).catch(() => {});
  }, 500);
}

export function emitAccountActivated(storeId: string) {
  console.log(`[Realtime Event] Emitting ACCOUNT_ACTIVATED to store_${storeId}`);
  emitToStore(storeId, 'ACCOUNT_ACTIVATED', {
    message: 'Your store account has been activated.',
  });
  emitToAdmin('STORE_STATUS_CHANGED', { storeId, status: 'active' });
}

export function emitPaymentApproved(
  storeId: string,
  paymentId: string,
  subscription: StoreSubscription
) {
  console.log(`[Realtime Event] Emitting PAYMENT_APPROVED to store_${storeId}`);
  emitToStore(storeId, 'PAYMENT_APPROVED', {
    paymentId,
    subscription,
    message: 'Subscription payment approved! Your plan has been activated.',
  });
  // Also emit SUBSCRIPTION_ACTIVATED
  emitToStore(storeId, 'SUBSCRIPTION_ACTIVATED', {
    subscription,
  });
  emitToAdmin('PAYMENT_STATUS_CHANGED', { storeId, paymentId, status: 'approved', subscription });
}

export function emitPaymentRejected(
  storeId: string,
  paymentId: string,
  reason?: string
) {
  console.log(`[Realtime Event] Emitting PAYMENT_REJECTED to store_${storeId}`);
  emitToStore(storeId, 'PAYMENT_REJECTED', {
    paymentId,
    reason: reason || 'Payment transaction was rejected by administrator.',
    message: reason || 'Your subscription payment was rejected.',
  });
  emitToAdmin('PAYMENT_STATUS_CHANGED', { storeId, paymentId, status: 'rejected', reason });
}

export function emitSubscriptionActivated(storeId: string, subscription: StoreSubscription) {
  console.log(`[Realtime Event] Emitting SUBSCRIPTION_ACTIVATED to store_${storeId}`);
  emitToStore(storeId, 'SUBSCRIPTION_ACTIVATED', {
    subscription,
    message: 'Your subscription has been activated.',
  });
  emitToAdmin('SUBSCRIPTION_ACTIVATED', { storeId, subscription });
}

export function emitSubscriptionUpdated(storeId: string, subscription: StoreSubscription) {
  console.log(`[Realtime Event] Emitting SUBSCRIPTION_UPDATED to store_${storeId}`);
  emitToStore(storeId, 'SUBSCRIPTION_UPDATED', {
    subscription,
  });
  emitToAdmin('SUBSCRIPTION_UPDATED', { storeId, subscription });
}

export function emitSubscriptionExpired(storeId: string) {
  console.log(`[Realtime Event] Emitting SUBSCRIPTION_EXPIRED to store_${storeId}`);
  emitToStore(storeId, 'SUBSCRIPTION_EXPIRED', {
    message: 'Your subscription has expired. Please renew your plan.',
  });
  emitToAdmin('SUBSCRIPTION_EXPIRED', { storeId });
}

export function emitUserSuspended(userId: string, storeId?: string, reason?: string) {
  console.log(`[Realtime Event] Emitting USER_SUSPENDED for user ${userId}`);
  const payload = {
    userId,
    storeId,
    status: 'suspended',
    message: reason || 'Your user account has been suspended by the administrator.',
  };
  emitToUser(userId, 'USER_SUSPENDED', payload);
  if (storeId && storeId !== 'platform') {
    emitToStore(storeId, 'USER_SUSPENDED', payload);
  }
  emitToAdmin('USER_STATUS_CHANGED', { userId, storeId, status: 'suspended', reason });

  // Force disconnect socket connection for suspended user after brief delivery window
  setTimeout(() => {
    if (!io) return;
    io.in(`user_${userId}`).fetchSockets().then((sockets) => {
      sockets.forEach((s) => {
        s.disconnect(true);
      });
    }).catch(() => {});
  }, 500);
}

export function emitUserActivated(userId: string, storeId?: string) {
  console.log(`[Realtime Event] Emitting USER_ACTIVATED for user ${userId}`);
  const payload = {
    userId,
    storeId,
    status: 'active',
    message: 'Your user account has been activated.',
  };
  emitToUser(userId, 'USER_ACTIVATED', payload);
  if (storeId && storeId !== 'platform') {
    emitToStore(storeId, 'USER_ACTIVATED', payload);
  }
  emitToAdmin('USER_STATUS_CHANGED', { userId, storeId, status: 'active' });
}

export function emitUserUpdated(userId: string, storeId?: string, user?: any) {
  console.log(`[Realtime Event] Emitting USER_UPDATED for user ${userId}`);
  const payload = {
    userId,
    storeId,
    user,
  };
  emitToUser(userId, 'USER_UPDATED', payload);
  if (storeId && storeId !== 'platform') {
    emitToStore(storeId, 'USER_UPDATED', payload);
  }
  emitToAdmin('USER_UPDATED', payload);
}

export function emitTicketUpdated(ticketId: string, ticket: any) {
  console.log(`[Realtime Event] Emitting TICKET_UPDATED for ticket ${ticketId}`);
  if (ticket.storeId) {
    emitToStore(ticket.storeId, 'TICKET_UPDATED', { ticketId, ticket });
  }
  emitToAdmin('TICKET_UPDATED', { ticketId, ticket });
}

export function emitStoreUpdated(storeId: string, store: any) {
  console.log(`[Realtime Event] Emitting STORE_UPDATED for store ${storeId}`);
  emitToStore(storeId, 'STORE_UPDATED', { storeId, store });
  emitToAdmin('STORE_UPDATED', { storeId, store });
}

export function emitFeaturesUpdated(storeId: string, features: Record<string, boolean>) {
  console.log(`[Realtime Event] Emitting FEATURES_UPDATED for store ${storeId}`);
  emitToStore(storeId, 'FEATURES_UPDATED', { storeId, features });
  emitToAdmin('FEATURES_UPDATED', { storeId, features });
}
