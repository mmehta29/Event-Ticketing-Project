# Decentralized Event Ticketing & Identity Management

# Overview
We are building a decentralized event ticketing dApp built on Self-Sovereign Identity (SSI) principles. It eliminates fraud, scalping, and platform lock-in by cryptographically binding tickets to buyer-owned Decentralized Identifiers (DIDs), anchoring credential hashes on-chain, and storing full ticket metadata off-chain on IPFS.
Traditional platforms like Ticketmaster act as sole custodians of ticket records — buyers don't truly own their tickets. It returns that control to the buyer.

# Key Features
DID-Bound Tickets — Each ticket credential is tied to the buyer's Ethereum wallet (DID), making unauthorized duplication or resale cryptographically impossible
On-Chain Revocation — Gate scanners verify credential validity in real time via on-chain status bitmaps, no central server required
IPFS Metadata — Full ticket data (seat, venue, date, buyer DID) stored off-chain; only the content hash is anchored on-chain (GDPR-friendly)
Anti-Scalping — DID-bound transfers require on-chain authorization and auto-revoke the previous credential
Optional ZK Proofs — Age-threshold verification via SnarkJS without revealing the buyer's date of birth

# Blockchain: Polygon Mumbai Testnet
Smart Contracts: Solidity 
Frontend: React.js 
Off-Chain Storage: IPFS via web3.storage
Identity Standards: W3C DIDs v1.0 + Verifiable Credentials v1.1
