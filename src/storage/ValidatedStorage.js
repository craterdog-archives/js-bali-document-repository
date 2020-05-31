/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
'use strict';

/*
 * This class implements a storage mechanism wrapper that validates all contracts prior to
 * storing them in the wrapped storage mechanism and after retrieving them from the wrapped
 * storage mechanism.  The contracts are validated using the public certificate of the
 * notary key used to notarize them.
 */
const StorageMechanism = require('../StorageMechanism').StorageMechanism;


// PUBLIC FUNCTIONS

/**
 * This function creates a new instance of a validated storage mechanism.  A backend repository
 * is passed in and is used as the repository for all documents.
 *
 * @param {DigitalNotary} notary The digital notary to be used to validate the contracts.
 * @param {Object} repository The backend repository that maintains documents.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new validated storage mechanism.
 */
const ValidatedStorage = function(notary, repository, debug) {
    StorageMechanism.call(this, debug);
    debug = this.debug;
    const bali = this.bali;

    // validate the arguments
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/ValidatedStorage', '$ValidatedStorage', '$notary', notary, [
            '/javascript/Object'
        ]);
        validator.validateType('/bali/repositories/ValidatedStorage', '$ValidatedStorage', '$repository', repository, [
            '/javascript/Object'
        ]);
    }

    /**
     * This function returns a string providing attributes about this repository.
     *
     * @returns {String} A string providing attributes about this repository.
     */
    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/ValidatedStorage',
            $repository: repository.toString()
        });
        return catalog.toString();
    };

    this.nameExists = async function(name) {
        return await repository.nameExists(name);
    };

    this.readName = async function(name) {
        return await repository.readName(name);
    };

    this.writeName = async function(name, citation) {
        const contract = await repository.readContract(citation);
        await validateCitation(citation, contract);
        return await repository.writeName(name, citation);
    };

    this.draftExists = async function(citation) {
        return await repository.draftExists(citation);
    };

    this.readDraft = async function(citation) {
        const draft = await repository.readDraft(citation);
        if (draft) {
            await validateCitation(citation, draft);
        }
        return draft;
    };

    this.writeDraft = async function(draft) {
        return await repository.writeDraft(draft);
    };

    this.deleteDraft = async function(citation) {
        return await repository.deleteDraft(citation);
    };

    this.contractExists = async function(citation) {
        return await repository.contractExists(citation);
    };

    this.readContract = async function(citation) {
        const contract = await repository.readContract(citation);
        if (contract) {
            await validateCitation(citation, contract);
            await validateContract(contract);
        }
        return contract;
    };

    this.writeContract = async function(contract) {
        await validateContract(contract);
        return await repository.writeContract(contract);
    };

    this.messageAvailable = async function(bag) {
        return await repository.messageAvailable(bag);
    };

    this.messageCount = async function(bag) {
        return await repository.messageCount(bag);
    };

    this.addMessage = async function(bag, message) {
        await validateMessage(message);
        return await repository.addMessage(bag, message);
    };

    this.removeMessage = async function(bag) {
        const message = await repository.removeMessage(bag);
        if (message) await validateMessage(message);
        return message;
    };

    this.returnMessage = async function(bag, message) {
        await validateMessage(message);
        return await repository.returnMessage(bag, message);
    };

    this.deleteMessage = async function(bag, citation) {
        return await repository.deleteMessage(bag, citation);
    };

    // PRIVATE FUNCTIONS

    /**
     * This function validates the specified document citation against a document to make sure
     * that the citation digest was generated from the same document.  If not, an exception is
     * thrown.
     *
     * @param {Catalog} citation The document citation to be validated.
     * @param {Catalog} document The cited document.
     * @throws {Exception} The digest generated for the document does not match the digest
     * contained within the document citation.
     */
    const validateCitation = async function(citation, document) {
        if (!document) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$validateCitation',
                $exception: '$missingDocument',
                $citation: citation,
                $text: 'The cited document does not exist.'
            });
            throw exception;
        }
        const matches = await notary.citationMatches(citation, document);
        if (!matches) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$validateCitation',
                $exception: '$modifiedDocument',
                $citation: citation,
                $document: document,
                $text: 'The cited document was modified after it was committed.'
            });
            throw exception;
        }
    };


    /**
     * This function validates a contract. It makes sure that all notary seals
     * attached to the contract are valid. If any seal is not valid an exception is thrown.
     *
     * @param {Catalog} contract The contract to be validated.
     * @throws {Exception} The contract is not valid.
     */
    const validateContract = async function(contract) {
        // make sure it really is a contract
        const document = contract.getValue('$document');
        const certificateCitation = contract.getValue('$certificate');
        const signature = contract.getValue('$signature');
        if (!document || !certificateCitation || !signature) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$validateContract',
                $exception: '$contractInvalid',
                $contract: contract,
                $text: 'The contract is not notarized.'
            });
            throw exception;
        }

        // validate the previous version of the contract if one exists
        const previousCitation = document.getParameter('$previous');
        if (previousCitation && !previousCitation.isEqualTo(bali.pattern.NONE)) {
            const previousContract = await repository.readContract(previousCitation);
            await validateCitation(previousCitation, previousContract);
        }

        // validate the certificate if one exists
        var certificate;
        if (certificateCitation && !certificateCitation.isEqualTo(bali.pattern.NONE)) {
            certificate = await repository.readContract(certificateCitation);
            await validateCitation(certificateCitation, certificate);
        } else {
            certificate = contract;  // the contract is a self-signed certificate
        }

        // validate the contract using its certificate
        const valid = await notary.validContract(contract, certificate);
        if (!valid) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$validateContract',
                $exception: '$contractInvalid',
                $contract: contract,
                $text: 'The signature on the contract is invalid.'
            });
            throw exception;
        }
    };


    return this;
};
ValidatedStorage.prototype = Object.create(StorageMechanism.prototype);
ValidatedStorage.prototype.constructor = ValidatedStorage;
exports.ValidatedStorage = ValidatedStorage;

