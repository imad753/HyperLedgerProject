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


// Chemins des certificats et clés nécessaires pour la connexion
const cryptoPath = path.resolve(
    '/mnt/c/Users/tabya/Desktop/Blockchain/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com'
);
const keyDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore');
const certDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts');
const tlsCertPath = path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');
const peerEndpoint = 'localhost:7051';
const peerHostAlias = 'peer0.org1.example.com';

// Décodeur pour convertir les résultats des transactions en texte lisible
const utf8Decoder = new TextDecoder();

async function main() {
    // Établir la connexion gRPC avec le réseau blockchain
    const client = await newGrpcConnection();

    // Initialiser la passerelle Fabric pour communiquer avec le contrat intelligent
    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        hash: hash.sha256,
    });

    try {
        // Accéder au réseau et au contrat intelligent
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        // Ajouter des docteurs en tant qu'agents dans le registre        
        console.log("\n=== Ajout de docteurs ===");
        // First Doctor
        await CreateAgent(contract, 'docteur1', 'Dr. Dupont', 'Médecin Généraliste');
        // Second Doctor
        await CreateAgent(contract, 'docteur2', 'Dr. Martin', 'Spécialiste Cardiologie');

        // Créer un dossier médical CDA pour un patient
        console.log("\n=== Création du CDA initial ===");
        const cdaId = 'cda1';
        await CreateCDA(contract, cdaId, 'Patient A', 'docteur1');

        /*
        console.log("\n=== Enregistrement d'activités et associations ===");
        await CreateActivity(contract, 'activite1', 'Consultation générale', '2023-11-01T10:00:00Z');
        await AssociateActivity(contract, 'cda1', 'activite1', 'docteur1');

        await CreateActivity(contract, 'activite2', 'Consultation en cardiologie', '2023-11-05T09:30:00Z');
        await AssociateActivity(contract, 'cda1', 'activite2', 'docteur2');*/
        
        
        
        // Ajouter des sections au CDA
        console.log("\n=== Ajout de sections au CDA ===");
        const section1Content = await Readxml('section1.xml');
        await CreateSection(contract, cdaId, 'section1', section1Content, 'docteur1');

        const section2Content = await Readxml('section2.xml');
        await CreateSection(contract, cdaId, 'section2', section2Content, 'docteur2');

        // Afficher l'historique complet d'une section
        console.log("\n=== Historique complet de la section1 ===");
        await GetHistoryForSection(contract, cdaId, 'section1');
        //await getHistoryForAsset(contract, 'activite1');


        // Récupérer le contenu complet du CDA et l'afficher
        console.log("\n=== Récupération du contenu complet du CDA ===");
        const cdaContent = await GetCDA(contract, cdaId);
        console.log(JSON.stringify(cdaContent, null, 2)); 


    } finally {
        gateway.close();
        client.close();
    }
}

    main().catch((error) => {
        console.error('******** FAILED to run the application:', error);
        process.exitCode = 1;
    });


    // Fonction pour établir une connexion gRPC sécurisée au réseau
    async function newGrpcConnection() {
        const tlsRootCert = await fs.readFile(tlsCertPath);
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
        return new grpc.Client(peerEndpoint, tlsCredentials, {
            'grpc.ssl_target_name_override': peerHostAlias,
        });
    }

    // Fonction pour créer une nouvelle identité à partir des certificats
    async function newIdentity() {
        const certPath = await getFirstDirFileName(certDirectoryPath);
        const credentials = await fs.readFile(certPath);
        return { mspId, credentials };
    }


    // Fonction pour récupérer le premier fichier d'un répertoire
    async function getFirstDirFileName(dirPath) {
        const files = await fs.readdir(dirPath);
        const file = files[0];
        if (!file) {
            throw new Error(`No files in directory: ${dirPath}`);
        }
        return path.join(dirPath, file);
    }


    // Fonction pour signer des transactions avec une clé privée
    async function newSigner() {
        const keyPath = await getFirstDirFileName(keyDirectoryPath);
        const privateKeyPem = await fs.readFile(keyPath);
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return signers.newPrivateKeySigner(privateKey);
    }


    // Fonction pour créer un agent (docteur) dans le registre
    async function CreateAgent(contract, agentId, nom, role) {
        console.log(`\n--> Submit Transaction: CréerAgent`);
        await contract.submitTransaction('CreateAgent', agentId, nom, role);
        console.log('*** Transaction committed successfully');
    }
    
    // Fonction pour créer un CDA (dossier médical) dans le registre
    async function CreateCDA(contract, cdaId, patientNom, docteurId) {
        console.log(`\n--> Submit Transaction: CréerCDA`);
        await contract.submitTransaction('CreateCDA', cdaId, patientNom, docteurId);
        console.log('*** CDA créé avec succès');
    }    
    /*
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
    }*/


    // Fonction pour récupérer l'historique d'un asset spécifique
    async function getHistoryForAsset(contract, assetId) {
        console.log(`\n--> Evaluate Transaction: GetHistoryForAsset`);
        const resultBytes = await contract.evaluateTransaction('GetHistoryForAsset', assetId);
        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);
        console.log('*** Result:', result);
    }
    
    // Fonction pour lire le contenu d'un fichier XML
    async function Readxml(nomFichier) {
        const cdaDir = path.resolve('./Sections');
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

    // Fonction pour créer une section dans un CDA
    async function CreateSection(contract, cdaId, sectionId, sectionContent, docteurId) {
        console.log(`\n--> Submit Transaction: CréerSection`);
        await contract.submitTransaction('CreateSection', cdaId, sectionId, sectionContent, docteurId);
        console.log('*** Section créée avec succès');
    }
    

    // Fonction pour modifier une section dans un CDA
    async function ModifySection(contract, cdaId, sectionId, newContent, docteurId) {
        console.log(`\n--> Submit Transaction: ModifierSection`);
        await contract.submitTransaction('ModifySection', cdaId, sectionId, newContent, docteurId);
        console.log('*** Section modifiée avec succès');
    }
    

    // Fonction pour afficher l'historique des modifications d'une section
    async function GetHistoryForSection(contract, cdaId, sectionId) {
        console.log(`\n--> Evaluate Transaction: GetHistoryForSection`);
        const resultBytes = await contract.evaluateTransaction('GetHistoryForSection', cdaId, sectionId);
        const history = JSON.parse(utf8Decoder.decode(resultBytes));
    
        console.log(`\n=== Historique complet de la section ${sectionId} ===`);
        history.forEach((entry, index) => {
            //console.log(`Modification ${index + 1}:`);
            console.log(`Timestamp: ${entry.Timestamp}`);
            console.log(`Section: ${JSON.stringify(entry.Section, null, 2)}`);
        });
    
        return history;
    }
    

    // Fonction pour récupérer le contenu complet d'un CDA
    async function GetCDA(contract, cdaId) {
        console.log(`\n--> Evaluate Transaction: GetCDA`);
        const resultBytes = await contract.evaluateTransaction('GetCDA', cdaId); 
        const resultJson = utf8Decoder.decode(resultBytes); 
    
        return JSON.parse(resultJson); 
    }
    


    

