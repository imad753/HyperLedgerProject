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

        console.log("\n=== Ajout de docteurs ===");
        await CreateAgent(contract, 'docteur1', 'Dr. Dupont', 'Médecin Généraliste');
        await CreateAgent(contract, 'docteur2', 'Dr. Martin', 'Spécialiste Cardiologie');

        console.log("\n=== Création du CDA initial ===");
        const cda1Content = await ReadCDA('CDA1.txt');
        await CreateCDA(contract, 'cda1', cda1Content, 'Patient A', 'docteur1');

        console.log("\n=== Enregistrement d'activités et associations ===");
        await CreateActivity(contract, 'activite1', 'Consultation générale', '2023-11-01T10:00:00Z');
        await AssociateActivity(contract, 'cda1', 'activite1', 'docteur1');

        await CreateActivity(contract, 'activite2', 'Consultation en cardiologie', '2023-11-05T09:30:00Z');
        await AssociateActivity(contract, 'cda1', 'activite2', 'docteur2');

        console.log("\n=== Mise à jour du CDA ===");
        const cda2Content = await ReadCDA('CDA2.txt');
        await ModifyCDA(contract, 'cda1', cda2Content, 'Patient A', 'docteur2');

        console.log("\n=== Historique complet du CDA ===");
        await getHistoryForAsset(contract, 'cda1');
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

    async function CreateAgent(contract, agentId, nom, role) {
        console.log(`\n--> Submit Transaction: CréerAgent`);
        await contract.submitTransaction('CreateAgent', agentId, nom, role);
        console.log('*** Transaction committed successfully');
    }

    async function CreateCDA(contract, cdaId, cdaContent, patientNom, docteurId) {
        console.log(`\n--> Submit Transaction: CréerCDA`);
        await contract.submitTransaction('CreateCDA', cdaId, cdaContent, patientNom, docteurId);
        console.log('*** Transaction committed successfully');
    }

    async function CreateActivity(contract, activiteId, description, timestamp) {
        console.log(`\n--> Submit Transaction: CréerActivité`);
        await contract.submitTransaction('CreateActivity', activiteId, description, timestamp);
        console.log('*** Transaction committed successfully');
    }

    async function AssociateActivity(contract, cdaId, activiteId, docteurId) {
        console.log(`\n--> Submit Transaction: AssocierActivité`);
        await contract.submitTransaction('AssociateActivity', cdaId, activiteId, docteurId);
        console.log('*** Transaction committed successfully');
    }

    async function ModifyCDA(contract, cdaId, nouveauCdaContent, patientNom, docteurId) {
        console.log(`\n--> Submit Transaction: ModifierCDA`);
        await contract.submitTransaction('ModifyCDA', cdaId, nouveauCdaContent, patientNom, docteurId);
        console.log('*** Transaction committed successfully');
    }

    async function getHistoryForAsset(contract, assetId) {
        console.log(`\n--> Evaluate Transaction: GetHistoryForAsset`);
        const resultBytes = await contract.evaluateTransaction('GetHistoryForAsset', assetId);
        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);
        console.log('*** Result:', result);
    }

    async function ReadCDA(nomFichier) {
        const cdaDir = path.resolve('./CDA');
        const filePath = path.join(cdaDir, nomFichier);

        try {
            const contenu = await fs.readFile(filePath, 'utf8');
            console.log(`*** Contenu du fichier ${nomFichier} chargé avec succès`);
            //console.log(contenu);
            return contenu;
        } catch (err) {
            console.error(`Erreur lors de la lecture du fichier ${nomFichier}:`, err);
            throw err;
        }
    }

