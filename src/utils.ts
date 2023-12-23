// utils.ts
import axios from 'axios';
import {
    AllObjectTypes,
    MarketsMessageType,
    ObMessageType,
    AccountMessageType,
    ChannelTypes
} from "./constants";

const DiscordWebHookUrl: string = process.env.DISCORD_URL as string;

/**
 * Sends a message to a specified Discord webhook.
 *
 * @param message - The message content to be sent to Discord.
 */
export async function sendDiscordNotification(message: string) {
    try {
        await axios.post(DiscordWebHookUrl, { content: message });
    } catch (error) {
        console.error("Error sending Discord notification:", error);
    }
}

/**
 * Type guard to check if an object is of the MarketsMessageType.
 *
 * @param obj - The object to check.
 * @returns True if the object is of MarketsMessageType, false otherwise.
 */
export function isMarketsMessageType(obj: AllObjectTypes): obj is MarketsMessageType {
    return "channel" in obj && obj.channel === ChannelTypes.Markets;
}

/**
 * Type guard to check if an object is of the ObMessageType.
 *
 * @param obj - The object to check.
 * @returns True if the object is of ObMessageType, false otherwise.
 */
export function isObMessageType(obj: AllObjectTypes): obj is ObMessageType {
    return "channel" in obj && obj.channel === ChannelTypes.Orderbook;
}

/**
 * Type guard to check if an object is of the AccountMessageType.
 *
 * @param obj - The object to check.
 * @returns True if the object is of AccountMessageType, false otherwise.
 */
export function isAccountsType(obj: AllObjectTypes): obj is AccountMessageType {
    return "channel" in obj && obj.channel === ChannelTypes.Subaccounts;
}