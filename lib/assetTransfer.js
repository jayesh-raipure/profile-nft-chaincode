/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const moment = require("moment");

class AssetTransfer extends Contract {

    async InitLedger(ctx, assets) {

        const assetsnew = JSON.parse(assets);

        for (const asset of assetsnew) {
            asset.docType = 'asset';
            asset.created_at = moment().format("DD/MM/YYYY HH:mm:ss");
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(asset.id, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    async CreateAsset(ctx, asset) {
        const new_asset = JSON.parse(asset);
        const exists = await this.AssetExists(ctx, new_asset.id);

        if (exists) {
            throw new Error(`The asset ${new_asset.id} already exists`);
        }

        //we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(new_asset.id, Buffer.from(stringify(sortKeysRecursive(new_asset))));
        return JSON.stringify(new_asset);
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        let queryString = {
            selector: {
                docType: "asset",
            },
            fields: [
                "id",
                "candidate_name",
                "created_at",
                "current_company",
                "current_ctc",
                "docType",
                "education",
                "first_name",
                "last_name",
                "owner",
                "resume_id",
                "technologies",
                "metaMask_token"
            ]
        };

        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        let result = await iterator.next();
        console.log(result);
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);

        // // const result = await this.QueryAssetsWithPagination(ctx,JSON.stringify(queryString), "10", "6")
        // return result;
    }

    async QueryAssetsWithPagination(ctx, queryString, pageSize, bookmark) {

        const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
        let results = {};

        results.results = await this._GetAllResults(iterator, false);

        results.ResponseMetadata = {
            RecordsCount: metadata.fetchedRecordsCount,
            Bookmark: metadata.bookmark
        };

        return JSON.stringify(results);
    }

    // This is JavaScript so without Funcation Decorators, all functions are assumed
    // to be transaction functions
    //
    // For internal functions... prefix them with _
    async _GetAllResults(iterator, isHistory) {
        let allResults = [];
        let result = await iterator.next();
        // while (!res.done) {
        // 	if (res.value && res.value.value.toString()) {
        // 		let jsonRes = {};
        // 		console.log(res.value.value.toString('utf8'));
        // 		if (isHistory && isHistory === true) {
        // 			jsonRes.TxId = res.value.txId;
        // 			jsonRes.Timestamp = res.value.timestamp;
        // 			try {
        // 				jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
        // 			} catch (err) {
        // 				console.log(err);
        // 				jsonRes.Value = res.value.value.toString('utf8');
        // 			}
        // 		} else {
        // 			jsonRes.Key = res.value.key;
        // 			try {
        // 				jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
        // 			} catch (err) {
        // 				console.log(err);
        // 				jsonRes.Record = res.value.value.toString('utf8');
        // 			}
        // 		}
        // 		allResults.push(jsonRes);
        // 	}
        // 	res = await iterator.next();
        // }


        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }

        iterator.close(); iterator.close();
        return allResults;
    }

    async createPaymentBlock(ctx, paymentDetails) {
        let data = JSON.parse(paymentDetails);
        data.created_at = moment().format("DD/MM/YYYY HH:mm:ss")
        data.expires_at = moment().add(10, "minute").format('X');
        await ctx.stub.putState(data.id, Buffer.from(stringify(sortKeysRecursive(data))));
        return JSON.stringify(data);
    }

    async checkAccess(ctx, clientId, resumeId) {
        let queryString = {
            selector: {
                payeer_id: clientId,
                resume_id: resumeId,
                docType: "paymentDetails",
                expires_at: {
                    "$gt": moment().format('X')
                }
            },
        };
        const allResults = [];
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        let result = await iterator.next();
        console.log(result);
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }

        let resume = {};
        if (allResults.length > 0) {
            // get the resume details
            resume = this.ReadAsset(ctx, allResults[0].resume_id);
            return resume;
        }
        return JSON.stringify(resume);
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    async updateAsset(ctx, id, updatedData) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        let getAsset = JSON.parse(await this.ReadAsset(ctx, id));
        // getAsset = JSON.parse(getAsset.toString())
        let assetFields = Object.keys(getAsset);
        // overwriting original asset with new asset
        let updatedAsset = JSON.parse(updatedData);

        assetFields.forEach(field => {
            if (updatedAsset.hasOwnProperty(field)) {
                getAsset[field] = updatedAsset[field]
            }
        });

        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(getAsset))));
        return JSON.stringify(getAsset);
    }

    async searchAsset(ctx, searchOptions) {
        let queryData = JSON.parse(searchOptions)
        let queryString = {
            selector: {
                ...queryData,
                docType: "asset",
            },
            fields: [
                "id",
                "candidate_name",
                "created_at",
                "current_company",
                "current_ctc",
                "docType",
                "education",
                "first_name",
                "last_name",
                "owner",
                "resume_id",
                "technologies",
                "metaMask_token",
                "gender",
                "experience"
            ]
        };
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        let result = await iterator.next();
        console.log(result);
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    async getProfileByWalletId(ctx, walletId) {
        let queryString = {
            selector: {
                metaMask_token: walletId,
                docType: "asset",
            },
            fields: [
                "id",
                "candidate_name",
                "created_at",
                "current_company",
                "current_ctc",
                "docType",
                "education",
                "email",
                "phone",
                "first_name",
                "last_name",
                "owner",
                "resume_id",
                "technologies",
                "metaMask_token",
                "gender",
                "experience"
            ]
        };
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        let result = await iterator.next();
        console.log(result);
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}

module.exports = AssetTransfer;
