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

## ✨ **Fonctionnalités de l'application**

L'application réalise les actions suivantes :

1. **Création de deux docteurs :**  
   Les docteurs `Dr. Dupont` (médecin généraliste) et `Dr. Martin` (spécialiste cardiologie) sont ajoutés à la blockchain comme agents.

2. **Création d'un CDA :**  
   Un dossier médical (`cda1`) est créé pour `Patient A` avec des informations initiales liées à `Dr. Dupont`.

3. **Ajout de sections au CDA :**  
   Deux sections sont ajoutées au CDA :  
   - Section 1 : Créée par `Dr. Dupont` avec un contenu lu depuis `section1.xml`.
   - Section 2 : Créée par `Dr. Martin` avec un contenu lu depuis `section2.xml`.

4. **Affichage de l'historique d'une section :**  
   L'historique des modifications de la **section 1** est affiché, indiquant chaque modification, son auteur, et le moment exact.

5. **Affichage complet du CDA :**  
   Le CDA complet est affiché, comprenant toutes les sections avec leurs hashes respectifs et les informations des agents responsables.

---

## 🖥️ **Exemple de sortie**

Voici un exemple de sortie après exécution de l'application :
``` bash
=== Ajout de docteurs ===

--> Submit Transaction: CréerAgent
*** Transaction committed successfully

--> Submit Transaction: CréerAgent
*** Transaction committed successfully

=== Création du CDA initial ===

--> Submit Transaction: CréerCDA
*** CDA créé avec succès

=== Ajout de sections au CDA ===
*** Contenu du fichier section1.xml chargé avec succès

--> Submit Transaction: CréerSection
*** Section créée avec succès
*** Contenu du fichier section2.xml chargé avec succès

--> Submit Transaction: CréerSection
*** Section créée avec succès

=== Historique complet de la section1 ===

--> Evaluate Transaction: GetHistoryForSection

=== Historique complet de la section section1 ===
Timestamp: 07/12/2024 20:24:14
Section: {
  "DocteurId": "docteur1",
  "DocteurNom": "Dr. Dupont",
  "Hash": "e08d9fa23f8761e5eef78ada7f1e76b986a9a715730b162077ac77404acb01ef",
  "Section_ID": "section1"
}

=== Récupération du contenu complet du CDA ===

--> Evaluate Transaction: GetCDA
{
  "DocteurId": "docteur1",
  "DocteurNom": "Dr. Dupont",
  "ID": "cda1",
  "PatientNom": "Patient A",
  "Sections": [
    {
      "DocteurId": "docteur1",
      "DocteurNom": "Dr. Dupont",
      "Hash": "e08d9fa23f8761e5eef78ada7f1e76b986a9a715730b162077ac77404acb01ef",
      "Section_ID": "section1"
    },
    {
      "DocteurId": "docteur2",
      "DocteurNom": "Dr. Martin",
      "Hash": "0fff59a3f1d2f5a19d5159bf5d0639bfd3361d60b47121c4b6e379e8816440ca",
      "Section_ID": "section2"
    }
  ],
  "Type": "CDA"
}
```

---

## 📂 **Structure des fichiers**

- **`app.js`** :  
  Script principal permettant d'interagir avec la blockchain. Il gère la création des docteurs, des CDAs, et l'ajout de sections, ainsi que la récupération des historiques et des CDAs complets.

- **`contract.js`** :  
  Smart Contract implémentant les règles métiers. Il permet :
  - La création et la modification de CDAs.
  - La gestion des sections à l'intérieur des CDAs.
  - La gestion des agents associés (docteurs).

- **`section1.xml`** et **`section2.xml`** :  
  Fichiers contenant les contenus à ajouter en tant que sections dans le CDA. Chaque fichier correspond à une section unique.

---

## 🛠️ **Technologies utilisées**

- **Hyperledger Fabric** :  
  Plateforme blockchain privée utilisée pour implémenter le réseau et gérer les transactions de manière sécurisée et traçable.

- **Node.js** :  
  Langage utilisé pour développer l'application cliente interagissant avec la blockchain.
 
  Langage utilisé pour implémenter le Smart Contract gérant les règles métiers.

---



