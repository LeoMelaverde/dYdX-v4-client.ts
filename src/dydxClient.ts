// dydxClient.ts
import {
    Endpoint,
    DenomConfig,
    DecimalConfig
} from "./constants"

import {
    IndexerConfig,
    ValidatorConfig,
    Network,
    IndexerClient,
    SocketClient,
    ValidatorClient,
    CompositeClient,
    LocalWallet,
    BECH32_PREFIX
} from "@dydxprotocol/v4-client-js";

const mnemonicA: string = process.env.MNEMONIC_A as string;
const mnemonicB: string = process.env.MNEMONIC_B as string;

/**
 * A class to create various clients for interacting with the dYdX protocol.
 */
export class Clients {

    /**
     * Configuration for the dYdX Indexer API. This configuration specifies the endpoints
     * for the Indexer API and WebSocket connections.
     */
    private mainnetIndexerConfig: IndexerConfig = new IndexerConfig(
        Endpoint.Indexer,
        Endpoint.WebSocket
    )

    /**
     * Configuration for the dYdX Validator API. This configuration includes the endpoint
     * for the Validator API and settings related to the blockchain network, such as
     * denominations and decimals for various tokens.
     */
    private mainnetValidatorConfig: ValidatorConfig = new ValidatorConfig(
        Endpoint.Validator,
        Endpoint.ChainId,
        {
            USDC_DENOM: DenomConfig.Usdc,
            USDC_DECIMALS: DecimalConfig.Usdc,
            USDC_GAS_DENOM: DenomConfig.UsdcGas,
            CHAINTOKEN_DENOM: DenomConfig.ChainToken,
            CHAINTOKEN_DECIMALS: DecimalConfig.ChainTokenDecimals
        }
    )

    /**
     * Custom configuration for the dYdX mainnet network. This configuration combines
     * both Indexer and Validator configurations to facilitate interactions with the
     * dYdX mainnet.
     */
    private mainnetNetwork: Network = new Network(Endpoint.Mainnet, this.mainnetIndexerConfig, this.mainnetValidatorConfig);

    /**
     * Creates an Indexer Client for interacting with the dYdX Indexer API.
     * @returns The IndexerClient instance.
     */
    public createIndexerClient(): IndexerClient {
        return new IndexerClient(this.mainnetNetwork.indexerConfig)
    }

    /**
     * Creates a Socket Client for real-time WebSocket communication with the dYdX API.
     * Example Usage:
     * const onOpen = () => console.log('WebSocket opened.');
     * const onClose = () => console.log('WebSocket closed');
     * const onMessage = (message) => console.log('Message received:', message);
     * const socketClient = createSocketClient(onOpen, onClose, onMessage);
     *
     * @param onOpen - Callback function invoked when the WebSocket connection is opened.
     * @param onClose - Callback function invoked when the WebSocket connection is closed.
     * @param onMessage - Callback function invoked when a message is received from the WebSocket.
     * @returns The SocketClient instance.
     */
    public createSocketClient(
        onOpen: () => void, // Use appropriate Event type
        onClose: () => void, // Use appropriate types
        onMessage: (data: any) => void // Use appropriate WebSocket.Data type
    ): SocketClient {
        const socketClient: SocketClient = new SocketClient(
            this.mainnetNetwork.indexerConfig,
            onOpen,
            onClose,
            onMessage,
        );

        socketClient.connect();
        return socketClient;
    }

    /**
     * Creates a Validator Client for interacting with the dYdX Validator API.
     * @returns A promise that resolves to the ValidatorClient instance.
     */
    public createValidatorClient(): Promise<ValidatorClient> {
        return ValidatorClient.connect(this.mainnetNetwork.validatorConfig);
    }

    /**
     * Creates a Composite Client that combines functionalities of both the Indexer and Validator clients.
     * @returns A promise that resolves to the CompositeClient instance.
     */
    public createCompositeClient(): Promise<CompositeClient> {
        return CompositeClient.connect(this.mainnetNetwork);
    }

    /**
     * Creates a Local Wallet using the mnemonic for wallet A.
     * @returns A promise that resolves to the LocalWallet instance for wallet A.
     */
    public createLocalWalletA(): Promise<LocalWallet> {
        return LocalWallet.fromMnemonic(mnemonicA, BECH32_PREFIX);
    }

    /**
     * Creates a Local Wallet using the mnemonic for wallet B.
     * @returns A promise that resolves to the LocalWallet instance for wallet B.
     */
    public createLocalWalletB(): Promise<LocalWallet> {
        return LocalWallet.fromMnemonic(mnemonicB, BECH32_PREFIX);
    }
}