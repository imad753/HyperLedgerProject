'use strict';

const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const chalk = require('chalk'); 

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspId = 'Org1MSP';

const cryptoPath = path.resolve(
    '/mnt/c/Users/tabya/Desktop/Blockchain/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com'
);
const keyDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore');
const certDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts');
const tlsCertPath = path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');
const peerEndpoint = 'localhost:7051';
const peerHostAlias = 'peer0.org1.example.com';

const utf8Decoder = new TextDecoder();

async function main() {
    console.log(chalk.yellow('=========================================================='));
    console.log(chalk.yellow('   DEMONSTRATION DU SUIVI MÉDICAL SUR HYPERLEDGER FABRIC'));
    console.log(chalk.yellow('==========================================================\n'));

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

        // ---------------------------------------------------------------------
        // 1. Création de plusieurs agents (docteurs)
        // ---------------------------------------------------------------------
        console.log(chalk.blue('>>> Création des agents (docteurs) :'));
        await CreateAgent(contract, 'docteur1', 'Dr. Dupont', 'Médecin Généraliste');
        await CreateAgent(contract, 'docteur2', 'Dr. Martin', 'Spécialiste Cardiologie');
        await CreateAgent(contract, 'docteur3', 'Dr. Bertrand', 'Neurologue');
        await CreateAgent(contract, 'docteur4', 'Dr. Lefevre', 'Pédiatre');
        await CreateAgent(contract, 'docteur5', 'Dr. Garcia', 'Chirurgien');
        console.log(chalk.green('>>> Tous les agents ont été créés avec succès.\n'));

        // ---------------------------------------------------------------------
        // 2. Création de plusieurs dossiers médicaux (CDAs) pour différents patients
        // ---------------------------------------------------------------------
        console.log(chalk.blue('>>> Création de plusieurs dossiers médicaux (CDAs) :'));
        await CreateCDA(contract, 'cda1', 'Alice Durand', 'docteur1');
        await CreateCDA(contract, 'cda2', 'Bob Martin', 'docteur2');
        await CreateCDA(contract, 'cda3', 'Claire Petit', 'docteur3');
        await CreateCDA(contract, 'cda4', 'David Moreau', 'docteur4');
        await CreateCDA(contract, 'cda5', 'Eva Laurent', 'docteur5');
        console.log(chalk.green('>>> Tous les CDAs ont été créés avec succès.\n'));

        // ---------------------------------------------------------------------
        // 3. Ajout de sections dans chaque CDA (un dossier unique par patient)
        // ---------------------------------------------------------------------
        console.log(chalk.blue('>>> Ajout de sections dans chaque CDA :'));

        const aliceInitial = await Readxml('alice.xml');          
        const aliceFollowup = await Readxml('alice_followup.xml');     

        const bobInitial = await Readxml('bob.xml');              
        const bobFollowup = await Readxml('bob_followup.xml');         

        const claireInitial = await Readxml('claire.xml');           
        const claireFollowup = await Readxml('claire_followup.xml');     

        const davidInitial = await Readxml('david.xml');            
        const davidFollowup = await Readxml('david_followup.xml');       

        const evaInitial = await Readxml('eva.xml');              
        const evaFollowup = await Readxml('eva_followup.xml');         

        // Ajout pour CDA1 (Alice Durand)
        await CreateSection(contract, 'cda1', 'section1', aliceInitial, 'docteur1');
        await CreateSection(contract, 'cda1', 'section2', aliceFollowup, 'docteur1');

        // Ajout pour CDA2 (Bob Martin)
        await CreateSection(contract, 'cda2', 'section1', bobInitial, 'docteur2');
        await CreateSection(contract, 'cda2', 'section2', bobFollowup, 'docteur2');

        // Ajout pour CDA3 (Claire Petit)
        await CreateSection(contract, 'cda3', 'section1', claireInitial, 'docteur3');
        await CreateSection(contract, 'cda3', 'section2', claireFollowup, 'docteur3');

        // Ajout pour CDA4 (David Moreau)
        await CreateSection(contract, 'cda4', 'section1', davidInitial, 'docteur4');
        await CreateSection(contract, 'cda4', 'section2', davidFollowup, 'docteur4');

        // Ajout pour CDA5 (Eva Laurent)
        await CreateSection(contract, 'cda5', 'section1', evaInitial, 'docteur5');
        await CreateSection(contract, 'cda5', 'section2', evaFollowup, 'docteur5');

        console.log(chalk.green('>>> Sections ajoutées avec succès dans tous les CDAs.\n'));


        // ---------------------------------------------------------------------
        // 4. Modifications de certaines sections pour simuler des mises à jour
        // ---------------------------------------------------------------------
        console.log(chalk.blue('>>> Modification de certaines sections pour refléter des mises à jour :'));
        await ModifySection(contract, 'cda1', 'section1', 'Mise à jour des antécédents médicaux d\'Alice.', 'docteur2');
        await ModifySection(contract, 'cda2', 'section2', 'Mise à jour du diagnostic de Bob.', 'docteur3');
        await ModifySection(contract, 'cda3', 'section1', 'Correction des données neurologiques de Claire.', 'docteur4');
        await ModifySection(contract, 'cda4', 'section2', 'Actualisation du bilan médical de David.', 'docteur5');
        await ModifySection(contract, 'cda5', 'section1', 'Modification du traitement chirurgical pour Eva.', 'docteur1');
        console.log(chalk.green('>>> Mises à jour effectuées avec succès.\n'));

        // ---------------------------------------------------------------------
        // 5. Suppression de certaines sections pour illustrer le suivi des suppressions
        // ---------------------------------------------------------------------
        console.log(chalk.blue('>>> Suppression de certaines sections :'));
        await DeleteSection(contract, 'cda1', 'section2', 'docteur3');
        await DeleteSection(contract, 'cda4', 'section1', 'docteur2');
        console.log(chalk.green('>>> Sections supprimées avec succès.\n'));

        // ---------------------------------------------------------------------
        // 6. Consultation des historiques de modifications pour certaines sections
        // ---------------------------------------------------------------------
        console.log(chalk.blue('>>> Consultation des historiques des sections :'));
        await GetHistoryForSection(contract, 'cda1', 'section1');
        await GetHistoryForSection(contract, 'cda2', 'section2');
        await GetHistoryForSection(contract, 'cda3', 'section1');
        await GetHistoryForSection(contract, 'cda4', 'section2');
        await GetHistoryForSection(contract, 'cda5', 'section1');
        console.log(chalk.green('>>> Historique consulté avec succès.\n'));

        // ---------------------------------------------------------------------
        // 7. Téléchargement (sauvegarde) de certains CDAs en fichiers locaux
        // ---------------------------------------------------------------------
        console.log(chalk.blue('>>> Téléchargement de certains CDAs :'));
        await DownloadCDA(contract, 'cda1');
        await DownloadCDA(contract, 'cda3');
        await DownloadCDA(contract, 'cda5');
        console.log(chalk.white('>>> Téléchargement des CDAs terminé.\n'));

        // ---------------------------------------------------------------------
        // 8. Récupération et affichage complet des contenus des CDAs
        // ---------------------------------------------------------------------
        console.log(chalk.blue('>>> Affichage complet des contenus des CDAs :'));
        const cdaIds = ['cda1', 'cda2', 'cda3', 'cda4', 'cda5'];
        for (const id of cdaIds) {
            const cdaContent = await GetCDA(contract, id);
            console.log(chalk.magenta(`\n>>> Contenu complet du CDA '${id}' :\n${JSON.stringify(cdaContent, null, 2)}`));
        }
        console.log(chalk.yellow('\n>>> Fin de la démonstration du suivi médical.'));
    } finally {
        gateway.close();
        client.close();
    }
}

main().catch((error) => {
    console.error(chalk.red('******** Échec de l\'exécution de l\'application :'), error);
    process.exitCode = 1;
});

// ---------------------------------------------------------------------
// Fonctions utilitaires pour établir la connexion et gérer l'identité
// ---------------------------------------------------------------------
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
        throw new Error(chalk.red(`Aucun fichier trouvé dans le répertoire: ${dirPath}`));
    }
    return path.join(dirPath, file);
}

async function newSigner() {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

// ---------------------------------------------------------------------
// Fonctions d'invocation des transactions sur le contrat (chaincode)
// ---------------------------------------------------------------------
async function CreateAgent(contract, agentId, nom, role) {
    console.log(chalk.cyan(`--> Envoi de la transaction : CreateAgent (${agentId}, ${nom}, ${role})`));
    await contract.submitTransaction('CreateAgent', agentId, nom, role);
    console.log(chalk.green('    Agent créé avec succès.\n'));
}

async function CreateCDA(contract, cdaId, patientNom, docteurId) {
    console.log(chalk.cyan(`--> Envoi de la transaction : CreateCDA (${cdaId}, ${patientNom}, ${docteurId})`));
    await contract.submitTransaction('CreateCDA', cdaId, patientNom, docteurId);
    console.log(chalk.green('    CDA créé avec succès.\n'));
}

async function CreateSection(contract, cdaId, sectionId, sectionContent, docteurId) {
    console.log(chalk.cyan(`--> Envoi de la transaction : CreateSection (${cdaId}, ${sectionId}, ${docteurId})`));
    await contract.submitTransaction('CreateSection', cdaId, sectionId, sectionContent, docteurId);
    console.log(chalk.green('    Section créée avec succès.\n'));
}

async function ModifySection(contract, cdaId, sectionId, newContent, docteurId) {
    console.log(chalk.cyan(`--> Envoi de la transaction : ModifySection (${cdaId}, ${sectionId}, ${docteurId})`));
    await contract.submitTransaction('ModifySection', cdaId, sectionId, newContent, docteurId);
    console.log(chalk.green('    Section modifiée avec succès.\n'));
}

async function DeleteSection(contract, cdaId, sectionId, docteurId) {
    console.log(chalk.cyan(`--> Envoi de la transaction : DeleteSection (${cdaId}, ${sectionId}, ${docteurId})`));
    await contract.submitTransaction('DeleteSection', cdaId, sectionId, docteurId);
    console.log(chalk.green('    Section supprimée avec succès.\n'));
}

async function GetHistoryForSection(contract, cdaId, sectionId) {
    console.log(chalk.cyan(`--> Consultation de l'historique de la section '${sectionId}' du CDA '${cdaId}'`));
    const resultBytes = await contract.evaluateTransaction('GetHistoryForSection', cdaId, sectionId);
    const history = JSON.parse(utf8Decoder.decode(resultBytes));

    const parseFrenchDate = (dateStr) => {
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes, seconds] = timePart.split(':');
        return new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hours, 10),
            parseInt(minutes, 10),
            parseInt(seconds, 10)
        );
    };

    history.sort((a, b) => parseFrenchDate(a.Timestamp) - parseFrenchDate(b.Timestamp));

    history.forEach((entry, index) => {
        console.log(chalk.white(`    Modification ${index + 1} - Timestamp: ${entry.Timestamp}`));
        console.log(chalk.white(`           Section: ${JSON.stringify(entry.Section, null, 2)}`));
        // Vous pouvez décommenter la ligne suivante pour afficher également les données PROV
        // console.log(chalk.white(`           PROV: ${JSON.stringify(entry.PROV, null, 2)}`));
    });
    console.log(chalk.green('    Historique récupéré.\n'));
    return history;
}

async function GetCDA(contract, cdaId) {
    console.log(chalk.cyan(`--> Consultation du contenu complet du CDA '${cdaId}'`));
    const resultBytes = await contract.evaluateTransaction('GetCDA', cdaId);
    const resultJson = utf8Decoder.decode(resultBytes);
    return JSON.parse(resultJson);
}

async function DownloadCDA(contract, cdaId) {
    console.log(chalk.cyan(`--> Téléchargement du CDA '${cdaId}'`));
    const resultBytes = await contract.evaluateTransaction('DownloadCDA', cdaId);
    const resultJson = utf8Decoder.decode(resultBytes);
    const outputPath = path.join(__dirname, `${cdaId}_download.json`);
    await fs.writeFile(outputPath, resultJson);
    console.log(chalk.green(`    CDA téléchargé avec succès dans le fichier : ${outputPath}\n`));
}

async function Readxml(nomFichier) {
    const cdaDir = path.resolve('./Sections');
    const filePath = path.join(cdaDir, nomFichier);
    try {
        const contenu = await fs.readFile(filePath, 'utf8');
        console.log(chalk.green(`    Fichier ${nomFichier} chargé avec succès.`));
        return contenu;
    } catch (err) {
        console.error(chalk.red(`    Erreur lors de la lecture du fichier ${nomFichier}:`), err);
        throw err;
    }
}
