# Event Ticketing dApp — CSE 540 Project 2

A decentralized event ticketing system built on Ethereum/Polygon using Solidity smart contracts.
Tickets are cryptographically bound to the buyer's wallet (DID), preventing duplication, scalping,
and fraud without relying on a centralized platform.

## Team
- Manya Mehta — Identity and Credential Design
- Sehastrajit Selvachandran — Event Registry Contract
- Samyogita Bhandari — Ticket Credential Contract
- Reshikesh Reddy Puttamreddy — Gate Verification
- Nandan Reddy Jalli — Off-Chain Integration

---

## Project Description

Traditional ticketing platforms like Ticketmaster act as sole custodians of ticket records.
This project replaces the middleman with three Solidity smart contracts:

- **EventRegistry.sol** — Organizers create events and store metadata (name, venue, date,
  ticket supply) on-chain. Only the IPFS content hash is stored on-chain to keep gas costs low.

- **TicketCredential.sol** — Issues cryptographically signed ticket credentials to buyer wallet
  addresses (their Decentralized Identifier). Handles DID-bound transfers with automatic
  revocation of the previous credential, making duplication impossible.

- **GateVerifier.sol** — Gate scanners call this contract at entry. It verifies the credential
  hash, checks revocation status, and prevents double-scanning. Emits audit logs without
  storing any PII on-chain.

- **CredentialRegistry.sol (Draft / Optional)** — Optional contract for scalable credential revocation

---

## Dependencies

- Node.js v22+
- npm v7+
- Hardhat 3
- Solidity 0.8.28

Install all dependencies:
```bash
npm install
```

---

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/mmehta29/Event-Ticketing-Project.git
cd Event-Ticketing-Project
```

2. Install dependencies:
```bash
npm install
```

3. Make sure you are using Node.js 22:
```bash
nvm use 22
```

4. Compile the contracts:
```bash
npx hardhat compile
```

5. Run the tests:
```bash
npx hardhat test
```

You should see 13 passing tests covering event creation, ticket issuance,
transfers, revocation, and gate verification.

---

## How to Deploy (incomplete — in progress)

Deployment to Polygon Amoy Testnet will use Hardhat Ignition.
Steps will be added as the project progresses.

---

## Smart Contract Overview

### EventRegistry.sol
- `createEvent(name, venue, date, ticketSupply)` — creates a new event, emits `EventCreated`
- `getEvent(eventId)` — returns event details
- `ticketsAvailable(eventId)` — returns remaining ticket count
- `recordTicketSale(eventId)` — called by TicketCredential when a ticket is sold

### TicketCredential.sol
- `issueTicket(eventId, buyer, credentialHash)` — issues a ticket credential to a buyer's wallet
- `transferTicket(ticketId, newHolder, newCredentialHash)` — transfers ticket to new DID
- `revokeTicket(ticketId, eventId)` — organizer can revoke a ticket
- `getCredential(ticketId)` — returns credential details
- `getHolderTickets(address)` — returns all ticket IDs owned by a wallet

### GateVerifier.sol
- `verifyTicket(ticketId, eventId, presentedHash)` — main gate scan function, returns
  one of: Valid, Invalid, Revoked, AlreadyUsed, EventMismatch
- `getVerificationLogs(ticketId)` — returns full audit trail for a ticket
- `getLastVerification(ticketId)` — returns the most recent scan result
- 
#### CredentialRegistry.sol (Draft / Optional)
- `revokeCredential(credentialHash)` — marks a credential hash as revoked  
- `isRevoked(credentialHash)` — checks if a credential has been revoked  
---

## Architecture

```
Buyer (MetaMask wallet = DID)
        |
        | buys ticket
        v
TicketCredential.sol  ──calls──>  EventRegistry.sol
        |                          (checks supply,
        | stores credential hash    records sale)
        |
        ├──calls──> CredentialRegistry.sol
        |             (revokes old credential hashes on transfer/revoke)
        v
    IPFS (full ticket data stored off-chain)
        |
        | at the gate
        v
GateVerifier.sol
   ├──checks──> TicketCredential.sol (ownership, status)
   ├──checks──> CredentialRegistry.sol (revocation status)
   └──verifies hash + prevents double-scan
```

---

## Testing

Tests are written in JavaScript using Node.js's built-in test runner.  
The test suite covers:

- Event creation and validation  
- Ticket issuance and supply tracking  
- Access control (only organizer can issue/revoke)  
- Ticket transfers between wallets  
- Gate verification: valid ticket, double scan, fake hash, revoked ticket  
- Credential revocation tracking via CredentialRegistry (draft integration)

Run tests:
```bash
npx hardhat test
```
