import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import "antd/dist/antd.css";
import {  JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import {  LinkOutlined } from "@ant-design/icons"
import "./App.css";
import { Row, Col, Button, Menu, Alert, Input, List,Divider, Card, Image, Switch as SwitchD } from "antd";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { useUserAddress } from "eth-hooks";
import { useExchangePrice, useGasPrice, useUserProvider, useContractLoader, useContractReader, useEventListener, useBalance, useExternalContractLoader } from "./hooks";
import { Header, Account, Faucet, Ramp, Contract, GasGauge, Address, AddressInput, ThemeSwitch } from "./components";
import { Transactor } from "./helpers";
import { formatEther, parseEther } from "@ethersproject/units";
import { utils } from "ethers";
//import Hints from "./Hints";
import { Hints, ExampleUI, Subgraph } from "./views"
import { useThemeSwitcher } from "react-css-theme-switcher";
import { INFURA_ID, DAI_ADDRESS, DAI_ABI, NETWORK, NETWORKS } from "./constants";
import StackGrid from "react-stack-grid";
import ReactJson from 'react-json-view'
import assets from './assets.js'
//import ReactScrollWheelHandler from "react-scroll-wheel-handler";

const { BufferList } = require('bl')
// https://www.npmjs.com/package/ipfs-http-client
const ipfsAPI = require('ipfs-http-client');
const ipfs = ipfsAPI({host: 'ipfs.infura.io', port: '5001', protocol: 'https' })

console.log("📦 Assets: ",assets)

/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/


/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS['localhost']; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true

//EXAMPLE STARTING JSON:
const STARTING_JSON =   {
    "name": "Godzilla",
    "description": "Raaaar!",
    "external_url": "https://austingriffith.com/portfolio/paintings/?id=godzilla",
    "image": "https://austingriffith.com/images/paintings/godzilla.jpg",
    "attributes": [
       {
         "trait_type": "BackgroundColor",
         "value": "orange"
       },
       {
         "trait_type": "Eyes",
         "value": "googly"
       },
       {
         "trait_type": "Stamina",
         "value": 99
       }
    ]
  }

//helper function to "Get" from IPFS
// you usually go content.toString() after this...
const getFromIPFS = async hashToGet => {
  for await (const file of ipfs.get(hashToGet)) {
    console.log(file.path)
    if (!file.content) continue;
    const content = new BufferList()
    for await (const chunk of file.content) {
      content.append(chunk)
    }
    console.log(content)
    return content
  }
}

// 🛰 providers
if(DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
const scaffoldEthProvider = new JsonRpcProvider("https://rpc.scaffoldeth.io:48544")
const mainnetInfura = new JsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_I

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if(DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new JsonRpcProvider(localProviderUrlFromEnv);


// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;


function App(props) {

  const mainnetProvider = (scaffoldEthProvider && scaffoldEthProvider._network) ? scaffoldEthProvider : mainnetInfura
  if(DEBUG) console.log("🌎 mainnetProvider",mainnetProvider)

  const [injectedProvider, setInjectedProvider] = useState();
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork,mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork,"fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);
  if(DEBUG) console.log("👩‍💼 selected address:",address)

  // You can warn the user if you would like them to be on a specific network
  let localChainId = localProvider && localProvider._network && localProvider._network.chainId
  if(DEBUG) console.log("🏠 localChainId",localChainId)

  let selectedChainId = userProvider && userProvider._network && userProvider._network.chainId
  if(DEBUG) console.log("🕵🏻‍♂️ selectedChainId:",selectedChainId)

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userProvider, gasPrice)

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice)

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);
  if(DEBUG) console.log("💵 yourLocalBalance",yourLocalBalance?formatEther(yourLocalBalance):"...")

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);
  if(DEBUG) console.log("💵 yourMainnetBalance",yourMainnetBalance?formatEther(yourMainnetBalance):"...")

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider)
  if(DEBUG) console.log("📝 readContracts",readContracts)

  // If you want to make 🔐 write transactions to your contracts, use the userProvider:
  const writeContracts = useContractLoader(userProvider)
  if(DEBUG) console.log("🔐 writeContracts",writeContracts)


  // keep track of a variable from the contract in the local React state:
  const balance = useContractReader(readContracts,"YourCollectible", "balanceOf", [ address ])
  console.log("🤗 balance:",balance)

  //📟 Listen for broadcast events
  const transferEvents = useEventListener(readContracts, "YourCollectible", "Transfer", localProvider, 1);
  console.log("📟 Transfer events:",transferEvents)



  //
  // 🧠 This effect will update yourCollectibles by polling when your balance changes
  //
  const yourBalance = balance && balance.toNumber && balance.toNumber()
  const [ yourCollectibles, setYourCollectibles ] = useState()


  // Burn or Mint
//const priceToMint = 1
const priceToMint = useContractReader(readContracts,"YourCollectible", "getCurrentPriceToMint")
console.log("🤗 priceToMint:",priceToMint)
//const priceToBurn = 1
const priceToBurn = useContractReader(readContracts,"YourCollectible", "getCurrentPriceToBurn")
console.log("🤗 priceToBurn:",priceToBurn)
const [ burnIdNFT, setBurnIdNFT ] = useState({})
const [ mintValue , setMintValue] = useState("0");

// Transfer
const [ transferToNFT, setTransferToNFT ] = useState({})
const [ transferToIdNFT, setTransferToIdNFT ] = useState({})
const [ transferFromNFT, setTransferFromNFT ] = useState({})


// Patronage
const [ depositPatronageIdNFT, setDepositPatronageIdNFT ] = useState({})
const [ depositPatronageValueNFT, setDepositPatronageValueNFT ] = useState({})
const [ withdrawPatronageIdNFT, setWithdrawPatronageIdNFT ] = useState({})
const [ withdrawValueNFT, setWithdrawPatronageValueNFT ] = useState({})
const [ checkPatronageIdNFT, setCheckPatronageIdNFT ] = useState({})
const [ checkPatronageOwedNFT, setCheckPatronageOwedNFT ] = useState(0)
const [ checkCurrPatronageBalNFT, setCurrPatronageBalNFT ] = useState(0)
const [ checkPatronageLastCollectNFT, setPatronageLastCollectNFT ] = useState(0)

  useEffect(()=>{
    const updateYourCollectibles = async () => {
      let collectibleUpdate = []
      for(let tokenIndex=0;tokenIndex<balance;tokenIndex++){
        try{
          console.log("Getting token index",tokenIndex)
          const tokenId = await readContracts.YourCollectible.tokenOfOwnerByIndex(address, tokenIndex)
          console.log("tokenId",tokenId)
          const tokenURI = await readContracts.YourCollectible.tokenURI(tokenId)
          console.log("tokenURI",tokenURI)

          const ipfsHash =  tokenURI.replace("https://ipfs.io/ipfs/","")
          console.log("ipfsHash",ipfsHash)

          const jsonManifestBuffer = await getFromIPFS(ipfsHash)

          try{
            const jsonManifest = JSON.parse(jsonManifestBuffer.toString())
            console.log("jsonManifest",jsonManifest)
            collectibleUpdate.push({ id:tokenId, uri:tokenURI, owner: address, ...jsonManifest })
          }catch(e){console.log(e)}

        }catch(e){console.log(e)}
      }
      setYourCollectibles(collectibleUpdate)
    }
    updateYourCollectibles()
  },[ address, yourBalance ])

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */


  let networkDisplay = ""
  if(localChainId && selectedChainId && localChainId != selectedChainId ){
    networkDisplay = (
      <div style={{zIndex:2, position:'absolute', right:0,top:60,padding:16}}>
        <Alert
          message={"⚠️ Wrong Network"}
          description={(
            <div>
              You have <b>{NETWORK(selectedChainId).name}</b> selected and you need to be on <b>{NETWORK(localChainId).name}</b>.
            </div>
          )}
          type="error"
          closable={false}
        />
      </div>
    )
  }else{
    networkDisplay = (
      <div style={{zIndex:-1, position:'absolute', right:154,top:28,padding:16,color:targetNetwork.color}}>
        {targetNetwork.name}
      </div>
    )
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname)
  }, [setRoute]);

  let faucetHint = ""
  const faucetAvailable = localProvider && localProvider.connection && localProvider.connection.url && localProvider.connection.url.indexOf(window.location.hostname)>=0 && !process.env.REACT_APP_PROVIDER && price > 1;

  const [ faucetClicked, setFaucetClicked ] = useState( false );
  if(!faucetClicked&&localProvider&&localProvider._network&&localProvider._network.chainId==31337&&yourLocalBalance&&formatEther(yourLocalBalance)<=0){
    faucetHint = (
      <div style={{padding:16}}>
        <Button type={"primary"} onClick={()=>{
          faucetTx({
            to: address,
            value: parseEther("0.01"),
          });
          setFaucetClicked(true)
        }}>
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    )
  }


  const [ yourJSON, setYourJSON ] = useState( STARTING_JSON );
  const [ sending, setSending ] = useState()
  const [ ipfsHash, setIpfsHash ] = useState()
  const [ ipfsDownHash, setIpfsDownHash ] = useState()

  const [ downloading, setDownloading ] = useState()
  const [ ipfsContent, setIpfsContent ] = useState()

  const [ transferToAddresses, setTransferToAddresses ] = useState({})

  function timeout(delay: number) {
      return new Promise( res => setTimeout(res, delay) );
  }

  const [ loadedAssets, setLoadedAssets ] = useState()
  useEffect(()=>{
    const updateYourCollectibles = async () => {
      let assetUpdate = []
      for(let a in assets){
        try{
          await timeout(100)
          const forSale = await readContracts.YourCollectible.forSale(utils.id(a))
          let owner
          if(!forSale){
            const tokenId = await readContracts.YourCollectible.uriToTokenId(utils.id(a))
            owner = await readContracts.YourCollectible.ownerOf(tokenId)
          }
          assetUpdate.push({id:a,...assets[a],forSale:forSale,owner:owner})
        }catch(e){console.log(e)}
      }
      setLoadedAssets(assetUpdate)
    }
    if(readContracts && readContracts.YourCollectible) updateYourCollectibles()
  }, [ assets, readContracts, transferEvents ]);

  let galleryList = []
  for(let a in loadedAssets){
    console.log("loadedAssets",a,loadedAssets[a])

    let cardActions = []
    if(loadedAssets[a].forSale){
      cardActions.push()
    }else{
      cardActions.push(
        <div>
          owned by: <Address
            address={loadedAssets[a].owner}
            ensProvider={mainnetProvider}
            blockExplorer={blockExplorer}
            minimized={true}
          />
        </div>
      )
    }

    galleryList.push(
      <Card style={{width:200}} key={loadedAssets[a].name}
        actions={cardActions}
        title={(
          <div>
            {loadedAssets[a].name} <a style={{cursor:"pointer",opacity:0.33}} href={loadedAssets[a].external_url} target="_blank"><LinkOutlined /></a>

            <div style={{margin: "auto", marginTop:15, paddingBottom:5 }}>
              <Button onClick={()=>{
                console.log("gasPrice,",gasPrice)
                tx( writeContracts.YourCollectible.mintCurve(loadedAssets[a].id,{value:priceToMint,gasPrice:gasPrice}) )
              }} type = "primary" >
                Mint !
              </Button>
            </div>

          </div>
        )}
      >
        <img style={{maxWidth:130}} src={loadedAssets[a].image}/>
        <div style={{opacity:0.77}}>
          {loadedAssets[a].description}
        </div>
      </Card>
    )
  }

  return (
    <div className="App">

      <Header />
      {networkDisplay}

      <BrowserRouter>

        <Menu style={{ textAlign:"center"}} selectedKeys={[route]} mode="horizontal">
          <Menu.Item key="/">
            <Link onClick={()=>{setRoute("/")}} to="/">Gallery</Link>
          </Menu.Item>
          <Menu.Item key="/whitepaper">
            <Link onClick={()=>{setRoute("/whitepaper")}} to="/whitepaper">Whitepaper</Link>
          </Menu.Item>
          <Menu.Item key="/yourcollectibles">
            <Link onClick={()=>{setRoute("/yourcollectibles")}} to="/yourcollectibles">YourCollectibles</Link>
          </Menu.Item>
          <Menu.Item key="/patron_portal">
            <Link onClick={()=>{setRoute("/patron_portal")}} to="/patron_portal">Patron Portal</Link>
          </Menu.Item>
          <Menu.Item key="/debugcontracts">
            <Link onClick={()=>{setRoute("/debugcontracts")}} to="/debugcontracts">Contract Debugging</Link>
          </Menu.Item>
        </Menu>

        <Switch>
          <Route exact path="/">
            {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}

            <div style={{ maxWidth:1000, margin: "auto", marginTop:32, paddingBottom:256 }}>
            <div style={{border:"1px solid #cccccc", padding:24, width:1000, margin:"auto",marginTop:5}}>


            <div style={{ border:"0px solid #cccccc", maxWidth:900,textAlign: 'left', margin: "auto", marginTop:10, paddingBottom:10}}>
            <div style={{ maxWidth:750,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:15 }}>
            <h3> Pátronage is an experimental, creator-centric royalty model that allows creators to collect royalties on all on-chain sales whether the creator's NFTs are bought / sold through Patrónage smart contracts, secondary-market platforms like OpenSea, or peer-to-peer on-chain transactions.  An automated liquidity system sets the prices for the cost of minting pieces and the reward for selling pieces back to the creator's gallery and royalty fees that are collected both contribute towards increasing the price of a NFT on the bonding curve and royalty payments to the NFT’s creator.  </h3>
            </div>

            <div style={{ maxWidth:500,textAlign: 'left', margin: "auto", marginTop:10, paddingBottom:10, backgroundColor: "wheat",textDecorationLine:"underline" }}>
            <h3> For a whitepaper on Pátronage, please visit the "Whitepaper" tab.</h3>
            <h3> For a video summary on Pátronage, please visit https://www.youtube.com/watch?v=twcO-Dpo1R4.</h3>
            </div>

            </div>

            <div style={{ border:"0px solid #cccccc", maxWidth:900,textAlign: 'left', margin: "auto", marginTop:10, paddingBottom:10}}>
            <div style={{ maxWidth:750,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:15 }}>
            <h2> Pátronage Statistics:  </h2>

            <h3>  - {yourBalance} of out 5 of Pátronage's 1st edition collection currently have patrons. </h3>
            <h3>  - Current Minting Cost: {priceToMint&&formatEther(priceToMint)} ETH </h3>
            <h3>  - Current Burning Reward: {priceToBurn&&formatEther(priceToBurn)}  ETH </h3>

            <div style={{ maxWidth:750,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:15 }}>
            </div>

            <div style={{ maxWidth:750,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:15, textDecorationLine:"underline" }}>
            <h2> Instructions: </h2>
            </div>
            <div style={{ maxWidth:750,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:15, backgroundColor: "wheat"}}>
            <h3> To use this demo, please note that this demo website uses Rinkeby testnet ETH so please ensure that you have selected the correct network on Metamask.  It is recommended that you use MetaMask on Rinkeby to experience the full capabilities of the Patrónage platform.
            </h3> </div>
            <h3>
            If you would like some Rinkeby ETH, please email isaaclau@mit.edu with your address and I’ll send some your way!
            </h3>
            <h3>
            Simply make sure that your address balance is greater than the current NFT price and click “Mint” to purchase the NFT of your choice.  To confirm that you own the NFT, click on the next tab “YourCollectibles” where you should now see your NFT.
            </h3>


            </div>
            </div>

            </div>

              <StackGrid
                columnWidth={200}
                gutterWidth={16}
                gutterHeight={16}
              >
                {galleryList}
              </StackGrid>

            </div>

          </Route>

          <Route path="/yourcollectibles">

          <div style={{border:"1px solid #cccccc", padding:24, width:600, margin:"auto",marginTop:25}}>
          <Divider/>

              <h2> Price to Burn 🔥: {priceToBurn&&formatEther(priceToBurn)} ETH </h2>

              <h2> Burn NFT ID:  </h2>
              <div style={{ width:100, margin: "auto", marginTop:15, paddingBottom:15 }}>
                <Input onChange={(e)=>{setBurnIdNFT(e.target.value)}} />
              </div>

              <div style={{ width:400, margin: "auto", marginTop:8, paddingBottom:10 }}>
              <Button onClick={()=>{
                tx( writeContracts.YourCollectible.burnCurve(burnIdNFT))
              }}
              type = "primary"
              >Burn NFT!
              </Button>
              </div>

          </div>

          <div style={{border:"1px solid #cccccc", padding:24, width:600, margin:"auto",marginTop:15, paddingBottom:15}}>
          <Divider/>

          <div style={{ maxWidth:450,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:15,textDecorationLine:"underline" }}>
          <h2> Instructions: </h2> </div>
          <div style={{ maxWidth:450,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:15, }}>
          <h3> Based on the MetaMask address provided, all NFTs that you have bought from the gallery will populate below.  Note that you are able to burn an NFT by typing in the NFT id number and clicking “Burn”.  You are also able to use this page to transfer your NFT as a simulated swap from seller to buyer.  Note that if you attempt to just transfer without paying the necessary patronage fees, the transfer will fail.  To check how much ETH you owe in patronage, use the “Patronage Portal” tab.
          </h3>
                    <div style={{ maxWidth:450,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:35, backgroundColor: "wheat"}}>
          <h3>
          ** NOTE: This particular demo requires that the entire gallery be bought before patronage taxation fees are applied to transfers so the full 5 must be minted first before attempting to check patronage balances / debt or depositing ETH into the contract**
          </h3>
          <h3>To test Patrónage’s built-in compatibility with OpenSea, please visit https://testnets.opensea.io/account where you will be able to view and then list one of the NFTs you have purchased from the gallery.  Note that once patronage fees have kicked in, in order for the listing sale to go through, you must have deposited enough ETH into the account for that particular NFT id; without paying the royalty fee, your transfer will revert.
          </h3>
          </div>
            </div>
                      </div>

          <Divider/>

            <div style={{ width:640, margin: "auto", marginTop:32, paddingTop: 15,paddingBottom:32 }}>
            <div style={{ width:640, margin: "right"}}>
            </div>
              <List
                bordered
                dataSource={yourCollectibles}
                renderItem={(item) => {
                  const id = item.id.toNumber()
                  return (

                    <List.Item key={id+"_"+item.uri+"_"+item.owner}>
                      <Card title={(
                        <div>
                          <span style={{fontSize:16, marginRight:8}}>#{id}</span> {item.name}
                        </div>
                      )}>
                        <div><img src={item.image} style={{maxWidth:150, maxHeight: 300}} /></div>
                        <div>{item.description}</div>
                      </Card>

                      <div>
                        Owner: <Address
                            address={item.owner}
                            ensProvider={mainnetProvider}
                            blockExplorer={blockExplorer}
                            fontSize={16}
                        />

                        <div style={{padding:5, width:100, margin:"left",}}>
                        <h4> Transfer: </h4>
                        </div>
                        <AddressInput
                          ensProvider={mainnetProvider}
                          placeholder="transfer_to_address"
                          value={transferToAddresses[id]}
                          onChange={(newValue)=>{
                            let update = {}
                            update[id] = newValue
                            setTransferToAddresses({ ...transferToAddresses, ...update})
                          }}
                        />
                        <h6>  </h6>
                        <Button onClick={()=>{
                          console.log("writeContracts",writeContracts)
                          tx( writeContracts.YourCollectible.transferFrom(address, transferToAddresses[id], id) )
                        }}>
                          Transfer
                        </Button>

                      </div>
                    </List.Item>

                  )
                }}
              />
            </div>
          </Route>

          <Route path="/curve_stats">

          <div style={{border:"1px solid #cccccc", padding:24, width:600, margin:"auto",marginTop:25}}>

          <h2> Transfer ✉️ </h2>

          <Divider />

          <div style={{margin:8}}>
            <div style={{textAlign:"left",width:325, marginTop:25, float:"left"}}>
            <h3>To Address: </h3>
            <Input onChange={(e)=>{setTransferToNFT(e.target.value)}} />
            </div>

            <div style={{textAlign:"left",width:115, marginTop:25, float:"right"}}>
            <h3>NFT ID: </h3>
            <Input onChange={(i)=>{setTransferToIdNFT(i.target.value)}} />
            </div>

          </div>

          <div style={{margin:8}}>
            <div style={{textAlign:"left",width:325, marginTop:25, float:"left"}}>
            <h3>From Address: </h3>
            <Input onChange={(o)=>{setTransferFromNFT(o.target.value)}} />
            </div>

          </div>


          <div style={{margin:10}}>
            <div style={{textAlign:"left",width:100, marginTop:50, float:"right"}}>
            <Button onClick={()=>{
              tx(writeContracts.YourCollectible.transferFrom(transferFromNFT,transferToNFT,transferToIdNFT));
            }}type = "primary"
            > Transfer
            </Button>
            </div>

          </div>

          <Divider/>
          </div>


          </Route>

          <Route path="/patron_portal">

          <Divider/>
          <div style={{border:"1px solid #cccccc", padding:24, width:600, margin:"auto",marginTop:25}}>

          <div style={{ maxWidth:450,textAlign: 'auto', margin: "auto", marginTop:25, paddingBottom:0 }}>
          <h2> Patrónage Balances 🏛️ </h2>

          <h3> Patronage Owed: {checkPatronageOwedNFT&&formatEther(checkPatronageOwedNFT)} ETH </h3>
          <h3> Patronage Balance: {checkCurrPatronageBalNFT&&formatEther(checkCurrPatronageBalNFT)} ETH </h3>
          <h3> Last collected: Block # {checkPatronageLastCollectNFT&&formatEther(checkPatronageLastCollectNFT)} </h3>
          </div>

          <Divider />
          <div style={{margin:8}}>
            <div style={{ width:100, margin: "auto", marginTop:16, paddingBottom:32 }}>
            <h2>NFT ID: </h2>
            <Input onChange={(e)=>{setCheckPatronageIdNFT(e.target.value)}} />
            </div>

            <Button onClick={async()=>{
              const val_1  = await readContracts.YourCollectible.taxOwed(checkPatronageIdNFT);
              const val_2  = await readContracts.YourCollectible.getPatronageBalance(checkPatronageIdNFT);
              const val_3  = await readContracts.YourCollectible.getPatronageLastCollected(checkPatronageIdNFT);

              setCheckPatronageOwedNFT(val_1);
              setCurrPatronageBalNFT(val_2);
              setPatronageLastCollectNFT(val_3);

            }}type = "primary"
            > Check Patronage Balance!
            </Button>

          </div>

          <Divider/>
          </div>
          <div style={{border:"1px solid #cccccc", padding:24, width:600, margin:"auto",marginTop:15, paddingBottom:15}}>
          <Divider/>

          <div style={{ maxWidth:450,textAlign: 'left', margin: "auto", marginTop:0, paddingBottom:15,textDecorationLine:"underline" }}>
          <h2> Instructions: </h2> </div>
          <div style={{ maxWidth:450,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:15, }}>
          <h3> To check each NFT’s royalty balance and debt, use this tab.  Patrónage Balances returns the amount owed, current balance, and last collection time of an inputted NFT id sold from the gallery.  Patrónage Deposit allows users to deposit ETH to cover their royalty fees. Please note that you must deposit enough to cover ETH to cover the royalty fees due at the time of a transfer call’s execution or it will revert your transaction.
          </h3>
          <div style={{ maxWidth:450,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:15,backgroundColor:"wheat" }}>
          <h3>
          ** NOTE: This particular demo requires that the entire gallery be bought before patronage taxation fees are applied to transfers so the full 5 must be minted first before attempting to check patronage balances / debt or depositing ETH into the contract**
          </h3> </div>
          </div>
            </div>

          <Divider/>
          <div style={{border:"1px solid #cccccc", padding:24, width:600, margin:"auto",marginTop:25}}>

          <div style={{ maxWidth:450,textAlign: 'auto', margin: "auto", marginTop:25, paddingBottom:0 }}>
          <h2> Patrónage Deposits </h2>
          </div>

          <Divider />
          <div style={{margin:8}}>
            <div style={{textAlign:"left",width:200, marginTop:15, float:"left"}}>
            <h3>NFT ID: </h3>
            <Input onChange={(e)=>{setDepositPatronageIdNFT(e.target.value)}} />
            </div>

          </div>

          <div style={{margin:8}}>
            <div style={{textAlign:"left",width:200, marginTop:25, float:"right"}}>
            <h3>Deposit Amount: </h3>
            <Input onChange={(e)=>{setDepositPatronageValueNFT(e.target.value)}} />
            </div>

          </div>


          <div style={{margin:10}}>
            <div style={{textAlign:"left",width:100, marginTop:150, float:"left"}}>
            <Button onClick={()=>{
              tx(writeContracts.YourCollectible.depositPatronage(depositPatronageIdNFT,
                {value:parseEther(depositPatronageValueNFT)}));
            }}type = "primary"
            > Deposit Patronage
            </Button>
            </div>

          </div>

          <Divider/>
          </div>

            <div style={{ width:600, margin: "auto", marginTop:32, paddingBottom:32 }}>
              <List
                bordered
                dataSource={transferEvents}
                renderItem={(item) => {
                  return (
                    <List.Item key={item[0]+"_"+item[1]+"_"+item.blockNumber+"_"+item[2].toNumber()}>
                      <span style={{fontSize:16, marginRight:8}}>#{item[2].toNumber()}</span>
                      <Address
                          address={item[0]}
                          ensProvider={mainnetProvider}
                          fontSize={16}
                      /> =>
                      <Address
                          address={item[1]}
                          ensProvider={mainnetProvider}
                          fontSize={16}
                      />
                    </List.Item>
                  )
                }}
              />
            </div>
          </Route>

          <Route path="/whitepaper">
          <div style={{border:"1px solid #cccccc", padding:24, width:950, margin:"auto",marginTop:15, paddingBottom:15}}>
          <Divider/>

          <div style={{ maxWidth:900,textAlign: 'left', margin: "auto", marginTop:0, paddingBottom:15,textDecorationLine:"underline" }}>
          <h2> Patrónage Whitepaper: </h2> </div>
          <div style={{ maxWidth:900,textAlign: 'left', margin: "auto", marginTop:15, paddingBottom:15, }}>

          <iframe src="https://drive.google.com/file/d/102QyojButmQ-fuRtv3HYPsu9JPWQq7jY/preview" width="850" height="1000"></iframe>

          </div>
            </div>
          </Route>

          <Route path="/debugcontracts">
              <Contract
                name="YourCollectible"
                signer={userProvider.getSigner()}
                provider={localProvider}
                address={address}
                blockExplorer={blockExplorer}
              />
          </Route>

        </Switch>
      </BrowserRouter>

      <ThemeSwitch />


      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
         <Account
           address={address}
           localProvider={localProvider}
           userProvider={userProvider}
           mainnetProvider={mainnetProvider}
           price={price}
           web3Modal={web3Modal}
           loadWeb3Modal={loadWeb3Modal}
           logoutOfWeb3Modal={logoutOfWeb3Modal}
           blockExplorer={blockExplorer}
         />
         {faucetHint}
      </div>

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
       <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
         <Row align="middle" gutter={[4, 4]}>
           <Col span={8}>
             <Ramp price={price} address={address} networks={NETWORKS}/>
           </Col>

           <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
             <GasGauge gasPrice={gasPrice} />
           </Col>
           <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
             <Button
               onClick={() => {
                 window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
               }}
               size="large"
               shape="round"
             >
               <span style={{ marginRight: 8 }} role="img" aria-label="support">
                 💬
               </span>
               Support
             </Button>
           </Col>
         </Row>

         <Row align="middle" gutter={[4, 4]}>
           <Col span={24}>
             {
               /*  if the local provider has a signer, let's show the faucet:  */
               faucetAvailable ? (
                 <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider}/>
               ) : (
                 ""
               )
             }
           </Col>
         </Row>
       </div>

    </div>
  );
}


/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
};

 window.ethereum && window.ethereum.on('chainChanged', chainId => {
  setTimeout(() => {
    window.location.reload();
  }, 1);
})

export default App;
