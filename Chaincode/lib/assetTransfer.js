'use strict';

const { Contract } = require('fabric-contract-api');
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const crypto = require('crypto');

class ProvenanceContract extends Contract {
    /*async InitLedger(ctx) {
        const items = [
            { ID: 'entite1', Type: 'Dossier', Nom: 'Dossier Médical A', Description: 'Dossier de santé initial' },
            { ID: 'agent1', Type: 'Agent', Nom: 'Dr. Dupont', Role: 'Médecin' },
        ];

        for (const item of items) {
            await ctx.stub.putState(item.ID, Buffer.from(stringify(sortKeysRecursive(item))));
        }
    }*/
    // ***************************************************/
    // ** Méthodes pour la Création et Modification de CDA **
    // ***************************************************/

    async CreateCDA(ctx, cdaId, cdaContent, patientNom, docteurId) {
        const exists = await this.CDAExists(ctx, cdaId);
        if (exists) {
            throw new Error(`Le CDA ${cdaId} existe déjà`);
        }
        const docteurAsBytes = await ctx.stub.getState(docteurId);
        if (!docteurAsBytes || docteurAsBytes.length === 0) {
            throw new Error(`Le docteur avec l'ID ${docteurId} n'existe pas`);
        }
        const docteur = JSON.parse(docteurAsBytes.toString());
    
        const hash = crypto.createHash('sha256').update(cdaContent).digest('hex');
        //console.log(`Hash calculé pour le CDA ${cdaId}: ${hash}`);

        const cda = {
            ID: cdaId,
            Type: 'CDA',
            Hash: hash,
            PatientNom: patientNom,
            DocteurId: docteur.ID,
            DocteurNom: docteur.Nom,
            Role: docteur.Role,
            //Timestamp: new Date().toISOString(),
        };
        console.log('test 4');
    
        await ctx.stub.putState(cdaId, Buffer.from(stringify(sortKeysRecursive(cda))));
        return JSON.stringify(cda);
    }
    
    async ModifyCDA(ctx, cdaId, nouveauCdaContent, patientNom, docteurId) {
        const exists = await this.CDAExists(ctx, cdaId);
        if (!exists) {
            throw new Error(`Le CDA ${cdaId} n'existe pas`);
        }
    
        const docteurAsBytes = await ctx.stub.getState(docteurId);
        if (!docteurAsBytes || docteurAsBytes.length === 0) {
            throw new Error(`Le docteur avec l'ID ${docteurId} n'existe pas`);
        }
        const docteur = JSON.parse(docteurAsBytes.toString());
    
        const nouveauHash = crypto.createHash('sha256').update(nouveauCdaContent).digest('hex');
    
        const cdaAsBytes = await ctx.stub.getState(cdaId);
        const cda = JSON.parse(cdaAsBytes.toString());
    
        cda.Hash = nouveauHash;
        cda.PatientNom = patientNom || cda.PatientNom;
        cda.DocteurId = docteur.ID;
        cda.DocteurNom = docteur.Nom;
        cda.Role = docteur.Role;
        //cda.Timestamp = new Date().toISOString();
    
        await ctx.stub.putState(cdaId, Buffer.from(stringify(sortKeysRecursive(cda))));
        return JSON.stringify(cda);
    }
    

    // ***************************************************************/
    // ** Méthodes pour la gestion des activités, history et agents **
    // ***************************************************************/

    async CreateAgent(ctx, agentId, nom, role) {
        const exists = await this.AgentExists(ctx, agentId);
        if (exists) {
            throw new Error(`L'agent ${agentId} existe déjà`);
        }

        const agent = {
            ID: agentId,
            Type: 'Agent',
            Nom: nom,
            Role: role,
        };
        await ctx.stub.putState(agentId, Buffer.from(stringify(sortKeysRecursive(agent))));
        return JSON.stringify(agent);
    }

    async CreateActivity(ctx, activiteId, description, timestamp) {
        const exists = await this.ActiviteExists(ctx, activiteId);
        if (exists) {
            throw new Error(`L'activité ${activiteId} existe déjà`);
        }

        const activite = {
            ID: activiteId,
            Type: 'Activité',
            Description: description,
            Timestamp: timestamp,
        };
        await ctx.stub.putState(activiteId, Buffer.from(stringify(sortKeysRecursive(activite))));
        return JSON.stringify(activite);
    }

    async AssociateActivity(ctx, cdaId, activiteId, docteurId) {
        const cda = JSON.parse((await ctx.stub.getState(cdaId)).toString());
        const docteur = JSON.parse((await ctx.stub.getState(docteurId)).toString());
        const activite = JSON.parse((await ctx.stub.getState(activiteId)).toString());

        if (!cda || !docteur || !activite) {
            throw new Error(`Les identifiants fournis ne correspondent pas à un CDA, un docteur ou une activité existants.`);
        }

        activite.AssociatedWithCDA = cdaId;
        activite.DocteurId = docteurId;
        activite.DocteurNom = docteur.Nom;
        activite.Role = docteur.Role;

        await ctx.stub.putState(activiteId, Buffer.from(stringify(sortKeysRecursive(activite))));
        return JSON.stringify(activite);
    }

    async GetHistoryForAsset(ctx, assetId) {
        const allResults = [];
        const iterator = await ctx.stub.getHistoryForKey(assetId);
        while (true) {
            const res = await iterator.next();
            if (res.value) {
                const tx = {
                    //txId: res.value.tx_id,
                    timestamp: res.value.timestamp,
                    data: JSON.parse(res.value.value.toString('utf8')),
                    //isDelete: res.value.is_delete,
                };
                allResults.push(tx);
            }
            if (res.done) {
                await iterator.close();
                return JSON.stringify(allResults);
            }
        }
    }

    // ***************************************************/
    // ** Méthodes utilitaires pour vérifier l'existence **
    // ***************************************************/

    async CDAExists(ctx, cdaId) {
        const cdaJSON = await ctx.stub.getState(cdaId);
        return cdaJSON && cdaJSON.length > 0;
    }

    async AgentExists(ctx, agentId) {
        const agentJSON = await ctx.stub.getState(agentId);
        return agentJSON && agentJSON.length > 0;
    }

    async ActiviteExists(ctx, activiteId) {
        const activiteJSON = await ctx.stub.getState(activiteId);
        return activiteJSON && activiteJSON.length > 0;
    }

    async getAgent(ctx, agentId) {
        const agentAsBytes = await ctx.stub.getState(agentId);
        if (!agentAsBytes || agentAsBytes.length === 0) {
            throw new Error(`L'agent ${agentId} n'existe pas`);
        }
        return JSON.parse(agentAsBytes.toString());
    }
}

module.exports = ProvenanceContract;
