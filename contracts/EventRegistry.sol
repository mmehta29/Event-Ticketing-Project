// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EventRegistry {

    // A struct is like a JavaScript object — groups related data together
    struct Event {
        uint256 id;
        string name;
        string venue;
        uint256 date;          // Unix timestamp e.g. 1746057600
        uint256 ticketSupply;
        uint256 ticketsSold;
        address organizer;     // the wallet address that created this event
        bool exists;
    }

    // A mapping is like a JavaScript Map — looks up an Event by its ID
    mapping(uint256 => Event) public events;

    // Simple counter to give each event a unique ID
    uint256 public eventCount;

    // Events (logs) — emitted when something important happens
    // Your React frontend will listen for these
    event EventCreated(
        uint256 indexed eventId,
        string name,
        address indexed organizer,
        uint256 ticketSupply
    );

    // modifier = reusable guard clause, like middleware in Express
    // This one checks the caller is the event's organizer
    modifier onlyOrganizer(uint256 eventId) {
        require(events[eventId].exists, "Event does not exist");
        require(events[eventId].organizer == msg.sender, "Not the organizer");
        _;  // this means "now run the rest of the function"
    }

    // CREATE an event
    function createEvent(
        string memory name,
        string memory venue,
        uint256 date,
        uint256 ticketSupply
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(ticketSupply > 0, "Must have at least 1 ticket");
        require(date > block.timestamp, "Date must be in the future");

        uint256 newId = eventCount;
        eventCount++;

        events[newId] = Event({
            id: newId,
            name: name,
            venue: venue,
            date: date,
            ticketSupply: ticketSupply,
            ticketsSold: 0,
            organizer: msg.sender,  // whoever called this function
            exists: true
        });

        emit EventCreated(newId, name, msg.sender, ticketSupply);

        return newId;
    }

    // READ a single event
    function getEvent(uint256 eventId) external view returns (Event memory) {
        require(events[eventId].exists, "Event does not exist");
        return events[eventId];
    }

    // READ how many tickets are still available
    function ticketsAvailable(uint256 eventId) external view returns (uint256) {
        require(events[eventId].exists, "Event does not exist");
        return events[eventId].ticketSupply - events[eventId].ticketsSold;
    }

    // Called by TicketCredential.sol later when a ticket is sold
    // internal = only other contracts can call this, not users directly
    function recordTicketSale(uint256 eventId) external {
        require(events[eventId].exists, "Event does not exist");
        require(
            events[eventId].ticketsSold < events[eventId].ticketSupply,
            "Sold out"
        );
        events[eventId].ticketsSold++;
    }
}