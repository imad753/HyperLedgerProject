# Suivi des Dossiers Médicaux Basé sur Blockchain

Ce projet vise à mettre en place un système de suivi des dossiers médicaux des patients en respectant le modèle **PROV-DM** (Provenance Data Model).

---

## 📖 **Introduction au modèle PROV-DM**

Le modèle PROV-DM est un cadre normatif pour représenter la provenance des données, c'est-à-dire leur historique de création, modification et gestion. Il permet de :

1. **Capturer la traçabilité :** Enregistrer les interactions entre des entités (données), des agents (utilisateurs) et des activités (actions réalisées).
2. **Garantir la transparence :** Identifier précisément qui a modifié quoi et à quel moment.
3. **Renforcer l'intégrité :** Assurer que les données n'ont pas été altérées sans autorisation.

Dans ce projet, chaque dossier médical (CDA - Clinical Document Architecture) est suivi selon ce modèle. Les modifications des sections d'un CDA, leur contenu et les agents responsables (comme les docteurs) sont enregistrés et vérifiables via des transactions sur la blockchain.

---

## 🚀 **Démarrage du projet**

### 1. **Configuration de la blockchain**

Téléchargez le dépôt **Hyperledger Fabric Samples** :  
[https://github.com/hyperledger/fabric-samples](https://github.com/hyperledger/fabric-samples)

### 2. **Lancer un réseau blockchain**

Positionnez-vous dans le répertoire `fabric-samples/test-network` et exécutez les commandes suivantes :

1. **Démarrer le réseau avec deux organisations et un canal :**

   ```bash
   ./network.sh up createChannel -c mychannel -ca
   ```
Cette commande configure un réseau blockchain avec deux organisations (Org1 et Org2) ayant chacune deux pairs.

2. **Déployer le Smart Contract sur le réseau :**

    ```bash
    ./network.sh deployCC -ccn basic -ccp [Chemin du chaincode] -ccl javascript
   ```
Remplacez [Chemin du chaincode] par le chemin du répertoire où se trouve le fichier Contract.

## 📖 **Exécution de l'application**

L'application est développée en Node.js et exécute les interactions avec la blockchain. Elle peut être lancée via le fichier app.js :

   ```bash
   node app.js
   ```

---



