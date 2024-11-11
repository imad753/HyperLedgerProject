'use strict';

const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspId = 'Org1MSP';


//Local Path to your organisation directory, either Org1 or Org2. It depends on your mspId
const cryptoPath = path.resolve(
    '/home/imadox/HyperLedger/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com'
);
const keyDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore');
const certDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts');
const tlsCertPath = path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');
const peerEndpoint = 'localhost:7051';
const peerHostAlias = 'peer0.org1.example.com';

const utf8Decoder = new TextDecoder();

async function main() {
    const client = await newGrpcConnection();

    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        hash: hash.sha256,
    });

    try {
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        await initLedger(contract);
        await créerEntité(contract, 'entite2', 'Dossier Médical B', 'Dossier de santé secondaire');
        await créerAgent(contract, 'agent2', 'Dr. Martin', 'Médecin');
        await créerActivité(contract, 'activite1', 'Consultation initiale', '2023-11-01T10:00:00Z');
        await associerActivité(contract, 'entite2', 'activite1', 'agent2');
        await modifierEntite(contract, 'entite2', 'Dossier Médical Modifié encore une fois', 'Description mise à jour');

        await getHistoryForAsset(contract, 'entite2');  
        //await getHistoryForAsset(contract, 'agent2');   
        //await getHistoryForAsset(contract, 'activite1');  


    } finally {
        gateway.close();
        client.close();
    }
}

main().catch((error) => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});

async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function getFirstDirFileName(dirPath) {
    const files = await fs.readdir(dirPath);
    const file = files[0];
    if (!file) {
        throw new Error(`No files in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
}

async function newSigner() {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}
//Function to init the ledger with some random data
async function initLedger(contract) {
    console.log('\n--> Submit Transaction: InitLedger');
    await contract.submitTransaction('InitLedger');
    console.log('*** Transaction committed successfully');
}

//Function to Create an entity inside the blockchain
async function créerEntité(contract, entiteId, nom, description) {
    console.log(`\n--> Submit Transaction: CréerEntité`);
    await contract.submitTransaction('CréerEntité', entiteId, nom, description);
    console.log('*** Transaction committed successfully');
}

//Function to Create an agent inside the blockchain
async function créerAgent(contract, agentId, nom, role) {
    console.log(`\n--> Submit Transaction: CréerAgent`);
    await contract.submitTransaction('CréerAgent', agentId, nom, role);
    console.log('*** Transaction committed successfully');
}

//Function to Create an activity inside the blockchain
async function créerActivité(contract, activiteId, description, timestamp) {
    console.log(`\n--> Submit Transaction: CréerActivité`);
    await contract.submitTransaction('CréerActivité', activiteId, description, timestamp);
    console.log('*** Transaction committed successfully');
}

//Function to associate an activity with an agent and an entity
async function associerActivité(contract, entiteId, activiteId, agentId) {
    console.log(`\n--> Submit Transaction: AssocierActivité`);
    await contract.submitTransaction('AssocierActivité', entiteId, activiteId, agentId);
    console.log('*** Transaction committed successfully');
}

//Function to get the fistory of an asset
async function getHistoryForAsset(contract, assetId) {
    console.log(`\n--> Evaluate Transaction: GetHistoryForAsset`);
    const resultBytes = await contract.evaluateTransaction('GetHistoryForAsset', assetId);
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', result);
}

//Function to modify an entity
async function modifierEntite(contract, entiteId, nouveauNom, nouvelleDescription) {
    console.log(`\n--> Submit Transaction: ModifierEntite`);
    await contract.submitTransaction('ModifierEntite', entiteId, nouveauNom, nouvelleDescription);
    console.log('*** Transaction committed successfully');
}

