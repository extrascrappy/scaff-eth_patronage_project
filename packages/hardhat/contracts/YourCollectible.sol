pragma solidity >=0.6.0 <0.7.0;
//SPDX-License-Identifier: MIT

//import "hardhat/console.sol";
import "./ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
//import "@openzeppelin/contracts/access/Ownable.sol";

contract YourCollectible is ERC721 {

  event Minted(uint256 indexed tokenId, uint256 indexed pricePaid, uint256 indexed reserveAfterMint);
  event Burned(uint256 indexed tokenId, uint256 indexed priceReceived, uint256 indexed reserveAfterBurn);

  // artist / creator multi-sig address
  address payable public artist = 0xcF3A24407aae7c87bd800c47928C5F20Cd4764D2;

  // Curve Pricing Vars
  uint256 public initMintPrice = 0.001 ether;
  uint256 public incrementPrice = 0.001 ether;

  // Curve Info Vars
  bool public postCurve = false;
  uint256 public maxMint = 5;
  uint256 public totalMint = 0;

  // Transfer Fees
  uint256 public patronageNumerator = 25;
  uint256 public patronageDenominator = 1000; // Default value => 2.5%

  // Artist Transfer Fees (for non EOAs)
  uint256 public patronageNumerator_NotEOA = 100;
  uint256 public patronageDenominator_NotEOA = 1000; // Default value => 10%

  // Post Curve Patronage Fee
  uint256 public curveNumerator = 100;
  uint256 public curveDenominator = 1000; // Default value => 10% per 100000 blocks

  // Marks an item in IPFS as "forsale"
  mapping (bytes32 => bool) public forSale;

  //Lets you look up a token by the uri / id (assuming there is only one of each uri for now)
  mapping (bytes32 => uint256) public uriToTokenId;
  mapping (uint256 => bytes32) public tokenIdToUri;

  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;

  constructor(bytes32[] memory assetsForSale) public ERC721("YourCollectible", "RBT") {
    _setBaseURI("https://ipfs.io/ipfs/");
    for(uint256 i=0;i<assetsForSale.length;i++){
      forSale[assetsForSale[i]] = true;
    }
  }

  // Asset owners calls this to deposit patronage payments
  function depositPatronage(uint256 nftId) public payable {
      require (postCurve == true, "Have not yet reached the post-curve state");
      taxBalances[nftId].balance += msg.value;
  }

  // Asset owners calls this to return current patronage owed; currently hardcoded to the percentage represented by curveNumerator/curveDenominator
  function taxOwed(uint256 nftId) public view returns (uint256) {
    require (postCurve == true, "Have not yet reached the post-curve state");
    uint256 assetPrice = getCurrentPriceToBurn();
    return (block.number - taxBalances[nftId].lastCollectedAt)*assetPrice* patronageNumerator / patronageDenominator / 100000; //approx 250 blocks per 24 hr
   }

   // Asset owners calls this to return current patronage payments stored in balance
   function getPatronageBalance(uint256 nftId) public view returns (uint256){
     require (postCurve == true, "Have not yet reached the post-curve state");
     return taxBalances[nftId].balance;
   }

   // Asset owners calls this to return the blocknumber of the last patronage collection
   function getPatronageLastCollected(uint256 nftId) public view returns (uint256){
     require (postCurve == true, "Have not yet reached the post-curve state");
     return taxBalances[nftId].lastCollectedAt;
   }

  // Checks and executes a foreclosure event
  function forecloseNBurn(uint256 nftId) internal returns (bool) { // internal
    taxBalances[nftId].forclosed = true;
    _foreclose(nftId);

    // Incentivizes artist to foreclose on delinquent assets by splitting half the burnCost with the curve and half to the artist
    artist.transfer(getCurrentPriceToBurn()/2);

    return true;
  }

  // By- default, the contract executes with enableRevert set to be True
  function collectNoForeclosure(uint256 nftId) internal returns (bool) { // internal
    uint256 taxes = taxOwed(nftId);

    if (taxes <= taxBalances[nftId].balance) {
        taxBalances[nftId].balance -= taxes;
        taxBalances[nftId].lastCollectedAt = block.number;

        // Checks and executes a token transfer fee when called through the contract itself
        artist.transfer(getCurrentPriceToBurn()*patronageNumerator/patronageDenominator);
        return true;
    }
    else {
          revert("Please pay your patronage!");
        }
  }

   // Only "whitelisted" addresses are able to collect patronage manually
  function collectArtist(uint256 nftId, bool enableRevert) public returns (bool) {

      require(msg.sender == artist, "Not a whitelisted address");
      require (postCurve == true, "Have not yet reached the post-curve state"); // transfer fees only apply once all NFTs have been sold

      uint256 taxes = taxOwed(nftId);

      if (taxes <= taxBalances[nftId].balance) {
          taxBalances[nftId].balance -= taxes;
          taxBalances[nftId].lastCollectedAt = block.number;

          // Gives artist a higher percentage of the taxes collected to recoupe gas costs
          artist.transfer(taxes*patronageNumerator_NotEOA/patronageDenominator_NotEOA);
          return true;
        }
      else {
        if (enableRevert==false) {
           forecloseNBurn(nftId);
        }
        else {
           revert("Please pay your patronage!");
        }
      }
    }

   // Interesed parties call this mint function to purchase a NFT of their chosing
  function mintCurve(string memory tokenURI) public virtual payable returns (uint256 _tokenId) {

      bytes32 uriHash = keccak256(abi.encodePacked(tokenURI));

      // Initial price & supply checks
      require(totalMint < maxMint, "No more NFTSs to be minted!");
      uint256 mintPrice = getCurrentPriceToMint();
      require(msg.value >= mintPrice, "Not enough ETH sent; check price");

      require(forSale[uriHash],"NOT FOR SALE");
      forSale[uriHash]=false;

      _tokenIds.increment();
      uint256 id = _tokenIds.current();

      _mint(msg.sender, id);
      _setTokenURI(id, tokenURI);
      taxBalances[id].forclosed = false;
      tokenIdToUri[id] = uriHash;
      totalMint = totalMint + 1;

      // Refund if overpaid
      if(msg.value.sub(mintPrice) > 0) {
          msg.sender.transfer(msg.value.sub(mintPrice));
      }

      initiateFees();

      emit Minted(_tokenId, mintPrice, address(this).balance);
      return _tokenId;
  }

  // Checks to see if it is time to initiate fees
  function initiateFees() internal returns (bool){
    if (totalMint == maxMint) {

      if (postCurve == false) {
        for (uint i = 1; i < totalMint+1; i++) {

            // only resets taxBalance struct a single time
            if (_exists(i)==true) {
              taxBalances[i].balance = 0;
              taxBalances[i].lastCollectedAt = block.number;
            }
        }
      postCurve = true; // sets the postCurve flag true a single time
      return true;
      }
    }
    return false;
  }

  // Interesed parties call this burn function to sell a NFT of their chosing
  function burnCurve(uint256 tokenId) public virtual {

      uint256 burnPrice = getCurrentPriceToBurn();
      _burn(tokenId);

      forSale[tokenIdToUri[tokenId]]=true; // sets NFT to be buyable again
      totalMint = totalMint - 1; //decrements totalMint to handle sales prior to postCurve being put into action

      msg.sender.transfer(burnPrice);

      emit Burned(tokenId, burnPrice, address(this).balance);
  }


  // Executes patronage fee logic as part of token transfers

  function _beforeTokenTransfer(address from,address to,uint256 tokenId) internal virtual override(ERC721) {
      super._beforeTokenTransfer(from, to, tokenId);

      if (_exists(tokenId)==true) {
        if (postCurve == true) {  // If NFT state is in postCurve, check for patronage fees
          //collect(tokenId, true);
          collectNoForeclosure(tokenId);
        }
      }
  }


  // Curve Code: One function sets the mint price; the other sets the burn price
  // Since we work with integers, we can simply use a summation (instead of an integral) for burn pricing

  // Sets mintPrice
  function getCurrentPriceToMint() public virtual view returns (uint256) {
    if (totalSupply() ==0) {
      return(initMintPrice);
    }

    else {
      uint256 mintPrice = (totalSupply()+1)*(incrementPrice);
      return (mintPrice);
    }
  }

  // Sets burnPrice
  function getCurrentPriceToBurn() public virtual view returns (uint256) {
    if (totalSupply() ==0) {
      return(0);
    }

    else {
      // Set burnPrice to 100%-transfer_fee of the burn reward to account for transfer fee
      if (postCurve==true) {
      uint256 burnPrice = ((address(this).balance/summation(totalSupply()))*totalSupply())*(1000-(patronageNumerator))/patronageDenominator;
      return (burnPrice);
    }

      else {
        uint256 burnPrice = ((address(this).balance/summation(totalSupply()))*totalSupply());
        return (burnPrice);
      }
    }
  }

  // Summation used for burnPrice calculations
  function summation(uint256 x) public virtual pure returns(uint256) {
      return x*(x+1)/2;
  }
}
