// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventRegistry.sol";
import "./CredentialRegistry.sol";

contract TicketCredential {

    // Reference to external contracts
    CredentialRegistry public credentialRegistry;

    // Every ticket's possible states
    enum TicketStatus { Valid, Used, Revoked, Transferred }

    struct Credential {
        uint256 ticketId;
        uint256 eventId;
        address holder;        // the buyer's wallet = their DID
        bytes32 credentialHash; // hash of full ticket data stored on IPFS
        TicketStatus status;
        uint256 issuedAt;
        bool exists;
    }

    // Look up a credential by its ticketId
    mapping(uint256 => Credential) public credentials;

    // Look up all ticketIds owned by a wallet address
    mapping(address => uint256[]) public holderTickets;

    uint256 public ticketCount;

    // Reference to the EventRegistry contract
    EventRegistry public eventRegistry;

    event TicketIssued(
        uint256 indexed ticketId,
        uint256 indexed eventId,
        address indexed holder,
        bytes32 credentialHash
    );

    event TicketTransferred(
        uint256 indexed ticketId,
        address indexed from,
        address indexed to,
        bytes32 newCredentialHash
    );

    event TicketRevoked(uint256 indexed ticketId, address holder);

    // modifier: only the ticket's current holder can call this
    modifier onlyHolder(uint256 ticketId) {
        require(credentials[ticketId].exists, "Ticket does not exist");
        require(credentials[ticketId].holder == msg.sender, "Not the ticket holder");
        _;
    }

    // modifier: only valid tickets can be acted on
    modifier onlyValid(uint256 ticketId) {
        require(credentials[ticketId].status == TicketStatus.Valid, "Ticket is not valid");
        _;
    }

    // Updated constructor (added CredentialRegistry)
    constructor(address eventRegistryAddress, address credentialRegistryAddress) {
        eventRegistry = EventRegistry(eventRegistryAddress);
        credentialRegistry = CredentialRegistry(credentialRegistryAddress);
    }

    // ISSUE a ticket to a buyer
    function issueTicket(
        uint256 eventId,
        address buyer,
        bytes32 credentialHash
    ) external returns (uint256) {

        EventRegistry.Event memory evt = eventRegistry.getEvent(eventId);
        require(evt.organizer == msg.sender, "Only organizer can issue tickets");

        uint256 available = eventRegistry.ticketsAvailable(eventId);
        require(available > 0, "Event is sold out");

        uint256 newTicketId = ticketCount;
        ticketCount++;

        credentials[newTicketId] = Credential({
            ticketId: newTicketId,
            eventId: eventId,
            holder: buyer,
            credentialHash: credentialHash,
            status: TicketStatus.Valid,
            issuedAt: block.timestamp,
            exists: true
        });

        holderTickets[buyer].push(newTicketId);

        eventRegistry.recordTicketSale(eventId);

        emit TicketIssued(newTicketId, eventId, buyer, credentialHash);

        return newTicketId;
    }

    // TRANSFER a ticket to a new holder
    function transferTicket(
        uint256 ticketId,
        address newHolder,
        bytes32 newCredentialHash
    ) external onlyHolder(ticketId) onlyValid(ticketId) {

        require(newHolder != address(0), "Invalid address");
        require(newHolder != msg.sender, "Cannot transfer to yourself");

        address oldHolder = credentials[ticketId].holder;

        // Revoke old credential in registry (draft feature)
        credentialRegistry.revokeCredential(credentials[ticketId].credentialHash);

        credentials[ticketId].holder = newHolder;
        credentials[ticketId].credentialHash = newCredentialHash;
        credentials[ticketId].status = TicketStatus.Transferred;

        holderTickets[newHolder].push(ticketId);

        emit TicketTransferred(ticketId, oldHolder, newHolder, newCredentialHash);

        credentials[ticketId].status = TicketStatus.Valid;
    }

    // REVOKE a ticket (organizer fraud prevention)
    function revokeTicket(uint256 ticketId, uint256 eventId) external {
        require(credentials[ticketId].exists, "Ticket does not exist");

        EventRegistry.Event memory evt = eventRegistry.getEvent(eventId);
        require(evt.organizer == msg.sender, "Only organizer can revoke");

        // Also mark credential as revoked in registry
        credentialRegistry.revokeCredential(credentials[ticketId].credentialHash);

        address holder = credentials[ticketId].holder;
        credentials[ticketId].status = TicketStatus.Revoked;

        emit TicketRevoked(ticketId, holder);
    }

    function getHolderTickets(address holder) external view returns (uint256[] memory) {
        return holderTickets[holder];
    }

    function getCredential(uint256 ticketId) external view returns (Credential memory) {
        require(credentials[ticketId].exists, "Ticket does not exist");
        return credentials[ticketId];
    }
}