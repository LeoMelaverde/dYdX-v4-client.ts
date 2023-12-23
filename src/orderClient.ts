// orderClient.ts
import {
    CompositeClient,
    OrderExecution,
    OrderFlags,
    OrderSide,
    OrderTimeInForce,
    OrderType,
    SubaccountClient,
    ValidatorClient,
    Order_TimeInForce
} from "@dydxprotocol/v4-client-js";

/**
 * This class provides methods to interact with the DYDX Protocol, enabling the placement and cancellation of various order types.
 * All asynchronous calls are purposely not being awaited to avoid any blocking in the rest of the file.
 */
export class Orders {
    private composite: CompositeClient;
    private subaccount: SubaccountClient;
    private validator: ValidatorClient;

    /**
     * Constructs an Orders instance.
     *
     * @param compositeClient - The CompositeClient instance for interacting with the DYDX Protocol.
     * @param subAccount - The SubaccountClient instance for account-specific actions.
     * @param validatorClient - The ValidatorClient instance for validation purposes.
     */
    constructor(compositeClient: CompositeClient, subAccount: SubaccountClient, validatorClient: ValidatorClient) {
        this.composite = compositeClient;
        this.subaccount = subAccount;
        this.validator = validatorClient;
    }

    /**
     * Generates a random number to be used as a client ID.
     * @returns A random number between 1 and 10,000,000.
     */
    private getRandomNumber(): number {
        return Math.floor(Math.random() * (10000000 - 1) + 1);
    }

    /**
     * Gets the current time in epoch seconds.
     * @returns The current time in epoch seconds.
     */
    private getEpochNow(): number {
        return new Date().getTime() / 1000;
    }

    /**
     * Calculates the 'good until' block height for short-term orders.
     * @returns A Promise that resolves to the block height.
     */
    private async calculateGoodTilBlock(): Promise<number> {
        return this.validator.get.latestBlockHeight()
            .then(height => height + 20)
            .catch(err => {
                console.error("Error fetching block height:", err);
                throw err; // Rethrow to handle it in the calling function
            });

    }

    /**
     * Places a limit order. (Short Term)
     * @param symbol - The symbol for the order.
     * @param side - The side of the order (buy or sell).
     * @param price - The price for the order.
     * @param size - The size of the order.
     * @returns A Promise that resolves to the order confirmation status.
     */
    public async shortTermOrder (
        symbol: string,
        side: OrderSide,
        price: number,
        size: number
    ): Promise<void>
    {
        const clientId: number = this.getRandomNumber();
        const reduceOnly: boolean = false;

        this.calculateGoodTilBlock()
            .then(goodTilBlock => {
                this.composite.placeShortTermOrder(
                    this.subaccount,
                    symbol,
                    side,
                    price,
                    size,
                    clientId,
                    goodTilBlock,
                    Order_TimeInForce.TIME_IN_FORCE_POST_ONLY,
                    reduceOnly
                ).catch(err => console.error("Error placing short term post-only order:", err));
            })
            .catch(err => console.error("Error calculating good til block on post-only order:", err));
    }

    /**
     * Places a market order. (Short Term)
     * @param symbol - The symbol for the order.
     * @param side - The side of the order (buy or sell).
     * @param price - The price for the order.
     * @param size - The size of the order.
     * @returns A Promise that resolves to the order confirmation status.
     */
    public async marketOrder (
        symbol: string,
        side: OrderSide,
        price: number,
        size: number
    ): Promise<void>
    {
        const clientId: number = this.getRandomNumber();
        const reduceOnly: boolean = false;

        this.calculateGoodTilBlock()
            .then(goodTilBlock => {
                this.composite.placeShortTermOrder(
                    this.subaccount,
                    symbol,
                    side,
                    price,
                    size,
                    clientId,
                    goodTilBlock,
                    Order_TimeInForce.TIME_IN_FORCE_FILL_OR_KILL,
                    reduceOnly
                ).catch(err => console.error("Error placing short term market order:", err));
            })
            .catch(err => console.error("Error calculating good til block on market order:", err));
    }

    /**
     * Places a limit order. (Long Term)
     * @param symbol - The symbol for the order.
     * @param side - The side of the order (buy or sell).
     * @param price - The price for the order.
     * @param size - The size of the order.
     * @param goodTilTime - The time until which the order remains valid.
     * @returns A Promise that resolves to the limit order data.
     */
    public async limitOrder (
        symbol: string,
        side: OrderSide,
        price: number,
        size: number,
        goodTilTime: number
    ): Promise<void>
    {
        const clientId: number = this.getRandomNumber();
        const type: OrderType = OrderType.LIMIT;
        const timeInForce: OrderTimeInForce = OrderTimeInForce.GTT;
        const execution: OrderExecution = OrderExecution.POST_ONLY;
        const postOnly: boolean = true;
        const reduceOnly: boolean = false;

        this.composite.placeOrder(
            this.subaccount,
            symbol,
            type,
            side,
            price,
            size,
            clientId,
            timeInForce,
            goodTilTime,
            execution,
            postOnly,
            reduceOnly,
        ).catch(err => console.error("Error placing long term post-only order:", err));
    }

    /**
     * Cancels an order.
     * @param id - The ID of the order to cancel.
     * @param symbol - The symbol for the order.
     * @param goodTillTime - The time until which the order was valid.
     * @returns A Promise that resolves to the order cancellation confirmation status.
     */
    public async cancelOrderLongTerm (
        id: number,
        symbol: string,
        goodTillTime: number
    ): Promise<void>
    {
        const orderFlag: OrderFlags = OrderFlags.LONG_TERM
        const goodTillBlock: number = 0
        const goodTillTimeInSeconds: number = goodTillTime - this.getEpochNow()

        this.composite.cancelOrder(
            this.subaccount,
            id,
            orderFlag,
            symbol,
            goodTillBlock,
            goodTillTimeInSeconds
        ).catch(err => console.error("Error cancelling long term order:", err));
    }
}