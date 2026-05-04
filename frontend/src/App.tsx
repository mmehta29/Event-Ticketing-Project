import { useState } from "react";
import { useWallet } from "./hooks/useWallet";
import { useContracts } from "./hooks/useContracts";
import OrganizerPanel from "./components/OrganizerPanel";
import MyTickets from "./components/MyTickets";
import GateVerify from "./components/GateVerify";
import { CONTRACT_ADDRESSES } from "./config";
import "./App.css";

type Tab = "organizer" | "tickets" | "gate";

const ZERO = "0x0000000000000000000000000000000000000000";
const contractsDeployed = Object.values(CONTRACT_ADDRESSES).every(addr => addr !== ZERO);

export default function App() {
  const [tab, setTab] = useState<Tab>("organizer");
  const { address, signer, provider, isConnecting, connect, disconnect } = useWallet();
  const contracts = useContracts(signer, provider);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">TicketChain</span>
          </div>
          <nav className="nav">
            <button className={tab === "organizer" ? "nav-tab active" : "nav-tab"} onClick={() => setTab("organizer")}>
              Organizer
            </button>
            <button className={tab === "tickets" ? "nav-tab active" : "nav-tab"} onClick={() => setTab("tickets")}>
              My Tickets
            </button>
            <button className={tab === "gate" ? "nav-tab active" : "nav-tab"} onClick={() => setTab("gate")}>
              Gate
            </button>
          </nav>
        </div>
        <div className="header-right">
          {address ? (
            <div className="wallet-info">
              <span className="wallet-dot" />
              <span className="wallet-addr">{address.slice(0, 6)}...{address.slice(-4)}</span>
              <button className="btn-ghost" onClick={disconnect}>Disconnect</button>
            </div>
          ) : (
            <button className="btn-connect" onClick={connect} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {!contractsDeployed && (
          <div className="banner warn">
            ⚠ Contracts not yet deployed. Fill in <code>src/config.ts</code> with your deployed contract addresses.
          </div>
        )}
        {!address && (
          <div className="connect-prompt">
            <div className="connect-icon">◈</div>
            <h2>Connect your wallet to continue</h2>
            <p>TicketChain uses MetaMask to interact with your local Hardhat node.</p>
            <button className="btn-connect large" onClick={connect} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </button>
          </div>
        )}
        {address && contracts && (
          <>
            {tab === "organizer" && <OrganizerPanel contracts={contracts} address={address} />}
            {tab === "tickets" && <MyTickets contracts={contracts} address={address} />}
            {tab === "gate" && <GateVerify contracts={contracts} address={address} />}
          </>
        )}
        {address && !contracts && (
          <div className="status error">Failed to initialize contracts. Check config.ts addresses.</div>
        )}
      </main>
    </div>
  );
}