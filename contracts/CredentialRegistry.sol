// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CredentialRegistry (DRAFT - NOT FINAL)
 *
 * This is an optional contract we are exploring.
 * It keeps track of revoked credential hashes separately.
 *
 * NOTE: Not part of final system yet.
 */
contract CredentialRegistry {

    // Maps credential hash → revoked or not
    mapping(bytes32 => bool) public revokedCredentials;

    event CredentialRevoked(bytes32 indexed credentialHash);

    function revokeCredential(bytes32 credentialHash) external {
        revokedCredentials[credentialHash] = true;
        emit CredentialRevoked(credentialHash);
    }

    function isRevoked(bytes32 credentialHash) external view returns (bool) {
        return revokedCredentials[credentialHash];
    }
}