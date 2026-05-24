// Simple in-memory connection manager to schedule/cancel graceful disconnects
const disconnectTimers = {};

export const scheduleDisconnectRemoval = (roomCode, userId, onExpire, ms = 15000) => {
    const key = `${roomCode.toUpperCase().trim()}:${String(userId)}`;
    if (disconnectTimers[key]) clearTimeout(disconnectTimers[key]);

    disconnectTimers[key] = setTimeout(async () => {
        try {
            await onExpire();
        } finally {
            delete disconnectTimers[key];
        }
    }, ms);

    return key;
};

export const cancelScheduledDisconnect = (roomCode, userId) => {
    const key = `${roomCode.toUpperCase().trim()}:${String(userId)}`;
    const t = disconnectTimers[key];
    if (t) {
        clearTimeout(t);
        delete disconnectTimers[key];
        return true;
    }
    return false;
};

export const hasScheduledDisconnect = (roomCode, userId) => {
    const key = `${roomCode.toUpperCase().trim()}:${String(userId)}`;
    return Boolean(disconnectTimers[key]);
};
