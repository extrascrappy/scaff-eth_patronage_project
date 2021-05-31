# 🏗 scaffold-eth - Pátronage Project

An experimental royalty / taxation model that builds off of existing counterfactual NFT minting contracts, bonding curve contracts, and transfer-fee contract patterns.  In theory, it applies a taaxation fee on all on-chain sales whether the creator's NFTs are bought / sold through Patrónage smart contracts, secondary-market platforms like OpenSea, or peer-to-peer on-chain transactions. Built around an automated liquidity system that dictates asset price, any royalty fees collected both contribute towards increasing the price of a NFT on the bonding curve and paying royalties to the NFT’s creator.

For more information and a whitepaper on the patronage system, please visit: https://drive.google.com/file/d/102QyojButmQ-fuRtv3HYPsu9JPWQq7jY/view?usp=sharing

For a live, public demo-website (beta), please visit: http://patronage.surge.sh/

---

## 🏃‍♀️ Quick Start

required: [Node](https://nodejs.org/dist/latest-v12.x/) plus [Yarn](https://classic.yarnpkg.com/en/docs/install/) and [Git](https://git-scm.com/downloads)

Git clone this repository and navigate to the home directory:

```bash
cd nft_robot
yarn install

```

```bash

yarn start

```

> in a second terminal window:

```bash
cd nft_robot
yarn chain

```

---

> ✏️ Edit the artwork manifest `artwork.js` with all of your own custom artwork (if you wish), then upload it to IPFS; If any artwork is changed, you may need to change the maxMint variable in the Solidity contracts to reflect the current number of artworks stored.

> in a third terminal window:

```bash
cd nft_robot

yarn upload

yarn deploy

```

📱 Open http://localhost:3000 to see the app

---
