'use strict';

const { Contract } = require('fabric-contract-api');
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const crypto = require('crypto');

class ProvenanceContract extends Contract {

    // *** Gestion des agents ***

    // Crée un nouvel agent (exemple : un docteur).netd
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

    async CreateCDA(ctx, cdaId, patientNom, docteurId) {
        const exists = await this.CDAExists(ctx, cdaId);
        if (exists) {
            throw new Error(`Le CDA ${cdaId} existe déjà`);
        }

        const docteurAsBytes = await ctx.stub.getState(docteurId);
        if (!docteurAsBytes || docteurAsBytes.length === 0) {
            throw new Error(`Le docteur avec l'ID ${docteurId} n'existe pas`);
        }

        const docteur = JSON.parse(docteurAsBytes.toString());

        const cda = {
            ID: cdaId,
            Type: 'CDA',
            PatientNom: patientNom,
            DocteurId: docteur.ID,
            DocteurNom: docteur.Nom,
            Sections: [],
            PROV: {
                wasGeneratedBy: `createCDA:${cdaId}`,
                wasAttributedTo: docteurId,
                //timestamp: new Date().toISOString(),
            },
        };

        await ctx.stub.putState(cdaId, Buffer.from(stringify(sortKeysRecursive(cda))));
        return JSON.stringify(cda);
    }

    async CreateSection(ctx, cdaId, sectionId, sectionContent, docteurId) {
        const cdaExists = await this.CDAExists(ctx, cdaId);
        if (!cdaExists) {
            throw new Error(`Le CDA ${cdaId} n'existe pas`);
        }

        const docteurAsBytes = await ctx.stub.getState(docteurId);
        if (!docteurAsBytes || docteurAsBytes.length === 0) {
            throw new Error(`Le docteur avec l'ID ${docteurId} n'existe pas`);
        }
        const docteur = JSON.parse(docteurAsBytes.toString());

        const hash = crypto.createHash('sha256').update(sectionContent).digest('hex');

        const section = {
            Section_ID: sectionId,
            Hash: hash,
            DocteurId: docteurId,
            DocteurNom: docteur.Nom,
            PROV: {
                wasGeneratedBy: `createSection:${sectionId}`,
                wasAttributedTo: docteurId,
                //timestamp: new Date().toISOString(),
            },
        };

        let cdaAsBytes = await ctx.stub.getState(cdaId);
        let cda = JSON.parse(cdaAsBytes.toString());

        if (!cda.Sections) {
            cda.Sections = [];
        }

        cda.Sections.push(section);

        await ctx.stub.putState(cdaId, Buffer.from(stringify(sortKeysRecursive(cda))));
        return JSON.stringify(section);
    }

    async ModifySection(ctx, cdaId, sectionId, newContent, docteurId) {
        const cdaAsBytes = await ctx.stub.getState(cdaId);
        if (!cdaAsBytes || cdaAsBytes.length === 0) {
            throw new Error(`Le CDA ${cdaId} n'existe pas`);
        }

        const cda = JSON.parse(cdaAsBytes.toString());

        const docteurAsBytes = await ctx.stub.getState(docteurId);
        if (!docteurAsBytes || docteurAsBytes.length === 0) {
            throw new Error(`Le docteur avec l'ID ${docteurId} n'existe pas`);
        }
        const docteur = JSON.parse(docteurAsBytes.toString());

        const sectionIndex = cda.Sections.findIndex((sec) => sec.Section_ID === sectionId);
        if (sectionIndex === -1) {
            throw new Error(`La section ${sectionId} n'existe pas dans le CDA ${cdaId}`);
        }

        const hash = crypto.createHash('sha256').update(newContent).digest('hex');

        // Conserver l'ancienne valeur de hash pour la provenance
        const oldHash = cda.Sections[sectionIndex].Hash;

        cda.Sections[sectionIndex].Hash = hash;
        cda.Sections[sectionIndex].DocteurId = docteurId;
        cda.Sections[sectionIndex].DocteurNom = docteur.Nom;
        cda.Sections[sectionIndex].PROV = {
            wasDerivedFrom: oldHash,
            wasGeneratedBy: `modifySection:${sectionId}`,
            wasAttributedTo: docteurId,
            //timestamp: new Date().toISOString(),
        };

        await ctx.stub.putState(cdaId, Buffer.from(stringify(sortKeysRecursive(cda))));
        return JSON.stringify(cda.Sections[sectionIndex]);
    }

    async GetHistoryForSection(ctx, cdaId, sectionId) {
        const iterator = await ctx.stub.getHistoryForKey(cdaId);
        const allResults = [];
        let lastHash = null;

        while (true) {
            const res = await iterator.next();
            if (res.value) {
                const value = JSON.parse(res.value.value.toString('utf8'));
                const section = value.Sections?.find((sec) => sec.Section_ID === sectionId);

                if (section) {
                    if (section.Hash !== lastHash) {
                        const timestamp = new Date(res.value.timestamp.seconds * 1000);
                        const formattedTimestamp = new Intl.DateTimeFormat('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                            timeZone: 'Europe/Paris',
                        }).format(timestamp);

                        allResults.push({
                            Timestamp: formattedTimestamp,
                            Section: section,
                            PROV: section.PROV,
                        });
                        lastHash = section.Hash;
                    }
                }
            }

            if (res.done) {
                await iterator.close();
                break;
            }
        }

        return JSON.stringify(allResults);
    }

    // Récupère l'historique d'un asset spécifique
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

    async DeleteSection(ctx, cdaId, sectionId, docteurId) {
        const cdaAsBytes = await ctx.stub.getState(cdaId);
        if (!cdaAsBytes || cdaAsBytes.length === 0) {
            throw new Error(`Le CDA ${cdaId} n'existe pas`);
        }
        const cda = JSON.parse(cdaAsBytes.toString());

        const docteurAsBytes = await ctx.stub.getState(docteurId);
        if (!docteurAsBytes || docteurAsBytes.length === 0) {
            throw new Error(`Le docteur avec l'ID ${docteurId} n'existe pas`);
        }
        const docteur = JSON.parse(docteurAsBytes.toString());

        const sectionIndex = cda.Sections.findIndex((sec) => sec.Section_ID === sectionId);
        if (sectionIndex === -1) {
            throw new Error(`La section ${sectionId} n'existe pas dans le CDA ${cdaId}`);
        }

        const deletedSection = cda.Sections.splice(sectionIndex, 1)[0];

        deletedSection.PROV = {
            wasDerivedFrom: deletedSection.Hash,
            wasGeneratedBy: `deleteSection:${sectionId}`,
            wasAttributedTo: docteurId,
            //timestamp: new Date().toISOString(),
        };

        await ctx.stub.putState(cdaId, Buffer.from(stringify(sortKeysRecursive(cda))));
        return JSON.stringify(deletedSection);
    }

    async DownloadCDA(ctx, cdaId) {
        const cdaAsBytes = await ctx.stub.getState(cdaId);
        if (!cdaAsBytes || cdaAsBytes.length === 0) {
            throw new Error(`Le CDA avec l'ID ${cdaId} n'existe pas`);
        }
        const cda = JSON.parse(cdaAsBytes.toString());
        return JSON.stringify(cda, null, 2);
    }

    // *** Méthodes utilitaires ***

    // Vérifie si un CDA existe.
    async CDAExists(ctx, cdaId) {
        const cdaJSON = await ctx.stub.getState(cdaId);
        return cdaJSON && cdaJSON.length > 0;
    }

    // Vérifie si un agent existe.
    async AgentExists(ctx, agentId) {
        const agentJSON = await ctx.stub.getState(agentId);
        return agentJSON && agentJSON.length > 0;
    }

    // Récupère les données d'un CDA spécifique.
    async GetCDA(ctx, cdaId) {
        const cdaAsBytes = await ctx.stub.getState(cdaId);
        if (!cdaAsBytes || cdaAsBytes.length === 0) {
            throw new Error(`Le CDA avec l'ID ${cdaId} n'existe pas`);
        }
        const cda = JSON.parse(cdaAsBytes.toString());
        return cda;
    }
}

module.exports = ProvenanceContract;
