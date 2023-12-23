// socketHandler.ts
import WebSocket from "ws";
import {sendDiscordNotification} from "./utils";
import {
    Endpoint,
    Subscription,
    WebSocketEvent,
    MessageCallback
} from "./constants";

/**
 * Handles WebSocket connections, including message handling, reconnections, and error management.
 */
export class SocketHandler {
    private readonly subscriptions: Subscription[]
    private readonly callback: MessageCallback;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private readonly disconnectInterval = 24 * 60 * 60 * 1000; // 24 hours
    private pingInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 10;
    private onDisconnectCallback: (() => void) | null = null;
    private ws: WebSocket | null = null;

    /**
     * Constructs a SocketHandler instance.
     * @param subscriptions - The list of subscriptions for the WebSocket.
     * @param callback - The callback function to process received messages.
     */
    constructor(subscriptions: Subscription[], callback: MessageCallback) {
        this.subscriptions = subscriptions
        this.callback = callback;
    }

    /**
     * Subscribes to specified channels on the WebSocket.
     * @param ws - The WebSocket instance.
     * @param channels - An array of channel objects to subscribe to.
     */
    private subscribeToChannels(ws: WebSocket, channels: object[]): void {
        channels.forEach(channel => {
            try {
                ws.send(JSON.stringify(channel));
            } catch (error) {
                console.error('Error sending subscription message:', error);
            }
        });
    }

    /**
     * Starts a timer that automatically disconnects the WebSocket after a specified interval.
     */
    private startDisconnectTimer(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = setTimeout(() => {
            console.log('Disconnecting after 24 hours.');
            this.ws?.close(); // This will trigger the 'close' event and the reconnect logic
        }, this.disconnectInterval);
    }

    /**
     * Starts an interval to send a ping message to the WebSocket server.
     * @param ws - The WebSocket instance to which the ping messages are sent.
     */
    private startPingInterval(ws: WebSocket): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }
        }, 30000);
    }

    /**
     * Send the disconnect callback to the index file to perform all the necessary cleanup in the data handlers.
     * Logs an error if we have not set the disconnect callback.
     */
    private sendDisconnectCallback(): void {
        // Invoke the disconnect callback
        if (this.onDisconnectCallback) {
            console.log('Calling disconnect callback.');

            // This will then perform all necessary cleanup within the index file
            this.onDisconnectCallback();

        } else {
            console.log('Disconnect callback is not set.');
        }

    }

    /**
     * Handles the closure of the WebSocket connection.
     * Manages reconnection attempts with an exponential backoff strategy and notifies upon reaching the maximum retry limit.
     */
    private async onClose(): Promise<void> {
        try {
            await sendDiscordNotification('WebSocket closed. Attempting to reconnect...');
            // Clear ping interval and reconnect timeout
            this.clearIntervals();

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                // Attempt reconnections up to the max amount
                await this.attemptReconnect();
            } else {
                await sendDiscordNotification('Max reconnection attempts reached.');
            }
        } catch (error) {
            await sendDiscordNotification(`Error in WebSocket onClose: ${error}`);
        }
    }

    /**
     * Clears any active intervals related to the WebSocket connection.
     * This includes clearing the ping interval and the disconnect timer.
     */
    private clearIntervals(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Attempts to reconnect the WebSocket connection using an exponential backoff strategy.
     */
    private async attemptReconnect(): Promise<void> {
        const reconnectDelay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, reconnectDelay));
        this.reconnectAttempts++;

        try {
            await this.connect();
            this.reconnectAttempts = 0; // Re-assign this to 0 after connection

        } catch (err) {
            await sendDiscordNotification(`Reconnection error: ${err}`);
        }
    }

    /**
     * Establishes a WebSocket connection. If an existing connection is open, it is closed before establishing a new one.
     * @returns A promise that resolves to the new WebSocket instance.
     */
    private async connect(): Promise<WebSocket> {
        // Check for any existing connections and close them
        await this.closeExistingConnection();

        // Establish the new connection
        const ws = new WebSocket(Endpoint.WebSocket);
        return this.setupWebSocket(ws);
    }

    /**
     * Closes any existing WebSocket connection and cleans up associated resources.
     */
    private async closeExistingConnection(): Promise<void> {
        if (this.ws) {
            // Clear all listeners from the previous WebSocket instance
            this.ws.removeAllListeners();
            // Close any existing connection if it's not already in CLOSING or CLOSED state
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
            // Dereference the previous WebSocket instance for garbage collection
            this.ws = null;
        }
    }

    /**
     * Sets up event listeners on a new WebSocket instance and handles its connection logic.
     * @param ws - The new WebSocket instance to be set up.
     * @returns A promise that resolves when the WebSocket is connected and set up.
     */
    private setupWebSocket(ws: WebSocket): Promise<WebSocket> {
        return new Promise<WebSocket>((resolve, reject) => {
            ws.on(WebSocketEvent.Open, () => {
                console.log('Connected.');
                this.onWebSocketOpen(ws);
                resolve(ws);
            });

            ws.on(WebSocketEvent.Message, (data: WebSocket.Data) => {
                this.handleWebSocketMessage(data);
            });

            ws.on(WebSocketEvent.Error, (error) => {
                this.handleWebSocketError(error, reject);
            });

            ws.on(WebSocketEvent.Close, () => {
                this.handleWebSocketClose().catch(err => console.error("Error handling websocket close:", err));
            });

            this.ws = ws;
        });
    }

    /**
     * Handles the 'open' event of the WebSocket. Sets up channel subscriptions, disconnect timer, and ping interval.
     * @param ws - The WebSocket instance that has been opened.
     */
    private onWebSocketOpen(ws: WebSocket): void {
        this.subscribeToChannels(ws, this.subscriptions); // Subscribe to all channels
        this.startDisconnectTimer(); // Start the disconnect timer
        this.startPingInterval(ws); // Send ping to socket every 30 seconds
    }

    /**
     * Processes messages received from the WebSocket.
     * @param data - The data received from the WebSocket message event.
     */
    private handleWebSocketMessage(data: WebSocket.Data): void {
        const obj = JSON.parse(data.toString());
        this.callback(obj);
    }

    /**
     * Handles errors from the WebSocket, logs them, sends notifications, and rejects the connection promise.
     * @param error - The error object received from the WebSocket error event.
     * @param reject - The reject function of the promise to reject the WebSocket connection.
     */
    private handleWebSocketError(error: Error, reject: (reason?: any) => void): void {
        console.error('WebSocket error:', error);
        reject(error); // Reject the promise if an error occurs
    }

    /**
     * Handles the closing of the WebSocket, including error logging and invoking the onClose handler.
     */
    private async handleWebSocketClose(): Promise<void> {
        try {
            // If we closed the socket, send the disconnect call back to the index file
            this.sendDisconnectCallback();
            // Handle the reconnection here
            await this.onClose();
        } catch (error) {
            console.error("Error awaiting onClose method for call back to main file.")
        }
    }

    /**
     * Sets a callback function to be called upon WebSocket disconnection.
     * @param callback - The callback function to execute on disconnection.
     */
    public onDisconnect(callback: () => void): void {
        this.onDisconnectCallback = callback;
    }

    /**
     Run the socket handler to manage all subscriptions
     */
    public async run(): Promise<void> {
        try {
            await this.connect();
            // The connect method will now handle message events and invoke the callback
            // No need to set the 'message' event listener here as it is done in the connect method
        } catch (error) {
            await sendDiscordNotification(`Websocket connection error: ${error}`);
        }
    }
}