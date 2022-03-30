# profile-nft-chaincode
# Setup Hyperledger Fabric

## Installing Hyperledger Fabric
---
```sh
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.1 1.5.2
```
Move chaincode-poc code under fabric-samples/asset-transfer-basic folder and install node packages
---
```sh
npm install
```

## Navigate to test-network folder
---
```sh
cd fabric-samples/test-network
```
---
Make sure network is down
```sh
./network.sh down
```

## Start the Network
---
```sh
./network.sh up createChannel -c mychannel -ca -s couchdb
```

## Install chaincode to the network
---
Run the below command to install chaincode
```sh
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-poc/ -ccl javascript
```

## Setup Nodejs application to communicate with hyperledger fabric
---
Copy the nft-poc-nodejs code to fabric-samples/asset-transfer-basic folder and install node packages
```sh
nmp install
```
---
Now goto /src folder and initialize user and admin, befor that delete wallet folder
```sh
cd /src
rm -r wallet
node initiate-user.js
node index.js
```
## Start Client application
---
Start the client app to communitate with backend using front-end app. Navigate to react-app-main
```sh
cd react-app-main
npm install
npm start
```
---
Visit http://localhost:3000 to see the application
