import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { TARGET_CHAIN_ID, TARGET_CHAIN_NAME } from "../config";

export interface WalletState {
    address: string | null;
    provider: ethers.BrowserProvider | null;
    signer: ethers.Signer | null;
    chainId: number | null;
    isConnecting: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
}

export function useWallet(): WalletState {
    const [address, setAddress] = useState<string | null>(null);
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [chainId, setChainId] = useState<number | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connect = useCallback(async () => {
        if (!window.ethereum) {
            setError("MetaMask not found. Please install it.");
            return;
        }
        setIsConnecting(true);
        setError(null);
        try {
            const _provider = new ethers.BrowserProvider(window.ethereum);
            await _provider.send("eth_requestAccounts", []);
            const _signer = await _provider.getSigner();
            const _address = await _signer.getAddress();
            const network = await _provider.getNetwork();
            const _chainId = Number(network.chainId);

            setProvider(_provider);
            setSigner(_signer);
            setAddress(_address);
            setChainId(_chainId);

            if (_chainId !== TARGET_CHAIN_ID) {
                setError(`Wrong network. Please switch to ${TARGET_CHAIN_NAME} (chain ${TARGET_CHAIN_ID})`);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to connect";
            setError(msg);
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        setAddress(null);
        setProvider(null);
        setSigner(null);
        setChainId(null);
        setError(null);
    }, []);

    useEffect(() => {
        if (!window.ethereum) return;
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) disconnect();
            else setAddress(accounts[0]);
        };
        const handleChainChanged = () => window.location.reload();

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);
        return () => {
            window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
            window.ethereum?.removeListener("chainChanged", handleChainChanged);
        };
    }, [disconnect]);

    return { address, provider, signer, chainId, isConnecting, error, connect, disconnect };
}
