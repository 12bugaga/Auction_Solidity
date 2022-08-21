// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import { Auction } from './Auction.sol';

contract FactoryAuction {
    address[] public auctions;

    event AuctionCreated(address auctionContract, address owner, uint numActions, address[] allAuctions);

    function createAuction(uint startBlock, uint endBlock, string memory ipfsHash, uint maxPrice) 
    public
    returns (address){
        Auction newAuction = new Auction(msg.sender,startBlock, endBlock, ipfsHash, maxPrice);
        auctions.push(address(newAuction));

        emit AuctionCreated(address(newAuction), msg.sender, auctions.length, auctions);
        return address(newAuction);
    }

    function allAuctions() public view returns(address[] memory){
        return auctions;
    }

    function amountAllAuctions() public view returns(uint){
        return auctions.length;
    }
}