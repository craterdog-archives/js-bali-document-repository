/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = 1;  // [0..3]
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
const assert = require('assert');
const bali = require('bali-component-framework').api(debug);
const account = bali.tag();
const directory = 'test/config/';
const notary = require('bali-digital-notary').test(account, directory, debug);
//const uri = 'https://bali-nebula.net';
const uri = 'http://localhost:3000';
const Storage = require('../');

const configuration = {
    names: 'bali-nebula-names-us-east-1',
    documents: 'bali-nebula-documents-us-east-1',
    contracts: 'bali-nebula-contracts-us-east-1',
    messages: 'bali-nebula-messages-us-east-1'
};

const mechanisms = {
    'Local Storage': Storage.local(notary, directory, debug),
    'Cached Storage': Storage.cached(Storage.local(notary, directory, debug), debug),
    'Validated Storage': Storage.validated(notary, Storage.local(notary, directory, debug), debug),
    'Remote Storage': Storage.remote(notary, uri, debug),
    'S3 Storage': Storage.s3(notary, configuration, debug)
};

describe('Bali Document Repository™', function() {

    for (var key in mechanisms) {
        const storage = mechanisms[key];

        const transaction = bali.instance('/bali/examples/Transaction/v1', {
            $timestamp: bali.moment(),
            $product: 'Snickers Bar',
            $quantity: 10,
            $price: '1.25($currency: $USD)',
            $tax: '1.07($currency: $USD)',
            $total: '13.57($currency: $USD)'
        });

        describe('Test ' + key, function() {
            var citation;
            var certificate;

            it('should create a self-signed certificate', async function() {
                const publicKey = await notary.generateKey();
                certificate = await notary.notarizeDocument(publicKey);
                citation = await notary.activateKey(certificate);
                expect(citation.isEqualTo(await storage.writeContract(certificate))).is.true;
            });

            it('should perform a named contract lifecycle', async function() {
                const tag = citation.getValue('$tag');
                const name = bali.component('/bali/certificates/' + tag.getValue() + '/v1');

                // make sure the new name does not yet exist in the repository
                expect(await storage.nameExists(name)).is.false;
                expect(await storage.readName(name)).to.not.exist;

                // create a new name in the repository
                expect(citation.isEqualTo(await storage.writeName(name, citation))).is.true;

                // make sure the new name exists in the repository
                expect(await storage.nameExists(name)).is.true;

                // fetch the named contract from the repository
                expect(citation.isEqualTo(await storage.readName(name))).is.true;

                // attempt to create the same name in the repository
                await assert.rejects(async function() {
                    await storage.writeName(name, citation);
                });
            });

            it('should perform a document lifecycle', async function() {
                const document = transaction;
                citation = await notary.citeDocument(document);

                // create a new document in the repository
                expect(citation.isEqualTo(await storage.writeDocument(document))).is.true;

                // make sure the new document exists in the repository
                expect(await storage.documentExists(citation)).is.true;

                // make sure the same contract does not exist in the repository
                expect(await storage.contractExists(citation)).is.false;

                // fetch the new document from the repository
                expect(document.isEqualTo(await storage.readDocument(citation))).is.true;

                // update the existing document in the repository
                expect(citation.isEqualTo(await storage.writeDocument(document))).is.true;

                // make sure the updated document exists in the repository
                expect(await storage.documentExists(citation)).is.true;

                // delete the document from the repository
                expect(document.isEqualTo(await storage.deleteDocument(citation))).is.true;

                // make sure the document no longer exists in the repository
                expect(await storage.documentExists(citation)).is.false;
                expect(await storage.readDocument(citation)).to.not.exist;

                // delete a non-existent document from the repository
                expect(await storage.deleteDocument(citation)).to.not.exist;
            });

            it('should perform a committed contract lifecycle', async function() {
                const document = transaction;
                citation = await notary.citeDocument(document);
                const contract = await notary.notarizeDocument(document);

                // make sure the new contract does not already exists in the repository
                expect(await storage.contractExists(citation)).is.false;
                expect(await storage.readContract(citation)).to.not.exist;

                // create a new contract in the repository
                expect(citation.isEqualTo(await storage.writeContract(contract))).is.true;

                // make sure the same document does not exist in the repository
                expect(await storage.documentExists(citation)).is.false;
                expect(await storage.readDocument(citation)).to.not.exist;

                // make sure the new contract exists in the repository
                expect(await storage.contractExists(citation)).is.true;

                // fetch the new contract from the repository
                expect(contract.isEqualTo(await storage.readContract(citation))).is.true;

                // make sure the new contract still exists in the repository
                expect(await storage.contractExists(citation)).is.true;

                // attempt to create the same contract in the repository
                await assert.rejects(async function() {
                    await storage.writeContract(contract);
                });
            });

            it('should perform a message bag lifecycle', async function() {
                // create the bag
                const contract = await notary.notarizeDocument(bali.instance('/bali/examples/Bag/v1', {
                    $description: 'This is an example bag.'
                }));
                const bag = await storage.writeContract(contract);

                // name the bag
                const name = bali.component('/bali/examples/' + bag.getValue('$tag').toString().slice(1) + '/v1');
                expect(bag.isEqualTo(await storage.writeName(name, bag))).is.true;

                // make sure the message bag is empty
                expect(await storage.messageAvailable(bag)).is.false;
                expect(await storage.removeMessage(bag)).to.not.exist;

                // add some messages to the bag
                const generateMessage = async function(count) {
                    return bali.instance('/bali/examples/Message/v1', {
                        $count: count
                    });
                };

                var message = await generateMessage(1);
                await storage.addMessage(bag, message);
                expect(await storage.messageCount(bag)).to.equal(1);
                expect(await storage.messageAvailable(bag)).is.true;
                await assert.rejects(async function() {
                    await storage.addMessage(bag, message);
                });

                message = await generateMessage(2);
                await storage.addMessage(bag, message);
                expect(await storage.messageCount(bag)).to.equal(2);
                expect(await storage.messageAvailable(bag)).is.true;

                message = await generateMessage(3);
                await storage.addMessage(bag, message);
                expect(await storage.messageCount(bag)).to.equal(3);
                expect(await storage.messageAvailable(bag)).is.true;

                // remove the messages from the bag
                message = await storage.removeMessage(bag);
                expect(await storage.messageCount(bag)).to.equal(2);
                await storage.returnMessage(bag, message);
                expect(await storage.messageCount(bag)).to.equal(3);

                message = await storage.removeMessage(bag);
                expect(await storage.messageCount(bag)).to.equal(2);
                var citation = await notary.citeDocument(message);
                expect(message.isEqualTo(await storage.deleteMessage(bag, citation))).is.true;
                expect(await storage.messageCount(bag)).to.equal(2);
                expect(await storage.messageAvailable(bag)).is.true;

                message = await storage.removeMessage(bag);
                expect(await storage.messageCount(bag)).to.equal(1);
                citation = await notary.citeDocument(message);
                expect(message.isEqualTo(await storage.deleteMessage(bag, citation))).is.true;
                expect(await storage.messageCount(bag)).to.equal(1);
                expect(await storage.messageAvailable(bag)).is.true;

                message = await storage.removeMessage(bag);
                expect(await storage.messageCount(bag)).to.equal(0);
                citation = await notary.citeDocument(message);
                expect(message.isEqualTo(await storage.deleteMessage(bag, citation))).is.true;
                expect(await storage.messageCount(bag)).to.equal(0);
                expect(await storage.messageAvailable(bag)).is.false;

                // make sure the message bag is empty
                expect(await storage.removeMessage(bag)).to.not.exist;
            });

            it('should reset the notary', async function() {
                await notary.forgetKey();
            });

        });

    }

});
