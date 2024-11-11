'use strict';

const { Contract } = require('fabric-contract-api');
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

class ProvenanceContract extends Contract {

    //Initializing Ledger with some Random data
    async InitLedger(ctx) {
        const items = [
            { ID: 'entite1', Type: 'Dossier', Nom: 'Dossier Médical A', Description: 'Dossier de santé initial' },
            { ID: 'agent1', Type: 'Agent', Nom: 'Dr. Dupont', Role: 'Médecin' },
        ];

        for (const item of items) {
            await ctx.stub.putState(item.ID, Buffer.from(stringify(sortKeysRecursive(item))));
        }
    }


//**************************************************/
// Methods to create objects within the blockchain***
//************************************************* */

    async CréerEntité(ctx, entiteId, nom, description) {
        const exists = await this.EntiteExists(ctx, entiteId);
        if (exists) {
            throw new Error(`L'entité ${entiteId} existe déjà`);
        }

        const entite = {
            ID: entiteId,
            Type: 'Entité',
            Nom: nom,
            Description: description,
        };
        await ctx.stub.putState(entiteId, Buffer.from(stringify(sortKeysRecursive(entite))));
        return JSON.stringify(entite);
    }

    async CréerAgent(ctx, agentId, nom, role) {
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

    async CréerActivité(ctx, activiteId, description, timestamp) {
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

    async AssocierActivité(ctx, entiteId, activiteId, agentId) {
        const entite = JSON.parse((await ctx.stub.getState(entiteId)).toString());
        const agent = JSON.parse((await ctx.stub.getState(agentId)).toString());
        const activite = JSON.parse((await ctx.stub.getState(activiteId)).toString());

        if (!entite || !agent || !activite) {
            throw new Error(`Les identifiants fournis ne correspondent pas à une entité, un agent ou une activité existants.`);
        }

        activite.wasGeneratedBy = entiteId;
        activite.wasAssociatedWith = agentId;

        await ctx.stub.putState(activiteId, Buffer.from(stringify(sortKeysRecursive(activite))));
        return JSON.stringify(activite);
    }

//**************************************************/
// Methods to modify objects within the blockchain***
//************************************************* */

async ModifierEntite(ctx, entiteId, nouveauNom, nouvelleDescription) {
    
    const exists = await this.EntiteExists(ctx, entiteId);
    if (!exists) {
        throw new Error(`L'entité ${entiteId} n'existe pas`);
    }

    const entiteAsBytes = await ctx.stub.getState(entiteId); 
    const entite = JSON.parse(entiteAsBytes.toString());

    entite.Nom = nouveauNom || entite.Nom;  
    entite.Description = nouvelleDescription || entite.Description;  

    await ctx.stub.putState(entiteId, Buffer.from(JSON.stringify(entite)));
    return JSON.stringify(entite);
}



//*********************************************************/
// Methods get history of objects within the blockchain  ***
//******************************************************* */    

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
    

//*********************************************************/
// Methods to verify existance  within the blockchain  ***
//******************************************************* */  

    async EntiteExists(ctx, entiteId) {
        const entiteJSON = await ctx.stub.getState(entiteId);
        return entiteJSON && entiteJSON.length > 0;
    }

    async AgentExists(ctx, agentId) {
        const agentJSON = await ctx.stub.getState(agentId);
        return agentJSON && agentJSON.length > 0;
    }

    async ActiviteExists(ctx, activiteId) {
        const activiteJSON = await ctx.stub.getState(activiteId);
        return activiteJSON && activiteJSON.length > 0;
    }
}

module.exports = ProvenanceContract;
