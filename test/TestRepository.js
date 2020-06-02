/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = 0;  // [0..3]
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
const assert = require('assert');
const bali = require('bali-component-framework').api(debug);
const account = bali.tag();
const directory = 'test/config/';
const notary = require('bali-digital-notary').test(account, directory, debug);
const Repository = require('../');
const storage = Repository.local(notary, directory, debug);
const repository = Repository.repository(notary, storage, debug);

const version = bali.version();
const name = bali.name(['bali', 'examples', 'transaction', version]);

const transaction = bali.instance('/bali/examples/Transaction/v1', {
    $timestamp: bali.moment(),
    $product: 'Snickers Bar',
    $quantity: 10,
    $price: '1.25($currency: $USD)',
    $tax: '1.07($currency: $USD)',
    $total: '13.57($currency: $USD)'
});


describe('Bali Document Repository™', function() {

    describe('Test Document Repository', function() {

        it('should create a self-signed certificate', async function() {
            const publicKey = await notary.generateKey();
            const certificate = await notary.notarizeDocument(publicKey);
            const certificateCitation = await notary.activateKey(certificate);
            expect(certificateCitation.isEqualTo(await storage.writeContract(certificate))).is.true;
        });

        it('should perform a document lifecycle', async function() {
            // save a new document to the repository
            const document = repository.createDocument(
                '/bali/examples/FooBar/v1',
                '/bali/permissions/public/v1', {
                    $foo: 'bar'
                }
            );
            const documentCitation = await repository.saveDocument(document);

            // make sure the new document exists in the repository
            expect(document.isEqualTo(await repository.retrieveDocument(documentCitation))).is.true;

            // discard the document in the repository
            expect(await repository.discardDocument(documentCitation)).is.true;

            // make sure the document no longer exists in the repository
            expect(await repository.retrieveDocument(documentCitation)).to.not.exist;

            // delete a non-existent document from the repository
            expect(await repository.discardDocument(documentCitation)).is.false;
        });

        it('should perform a contract lifecycle', async function() {
            const document = transaction;

            // make sure the new contract does not already exist in the repository
            expect(await repository.retrieveContract(name)).to.not.exist;

            // save the document in the repository
            const documentCitation = await repository.saveDocument(document);

            // make sure the new document exists in the repository
            expect(document.isEqualTo(await repository.retrieveDocument(documentCitation))).is.true;

            // commit the document to the repository
            await repository.commitDocument(name, document);

            // make sure the document no longer exists in the repository
            expect(await repository.retrieveDocument(documentCitation)).to.not.exist;

            // make sure the named contract exists in the repository
            expect(document.isEqualTo(await repository.retrieveDocument(name))).is.true;

            // attempt to commit the same version of the contract to the repository
            await assert.rejects(async function() {
                await repository.commitDocument(name, document);
            });
        });

        it('should perform a versioned contract lifecycle', async function() {
            const level = 2;
            const nextVersion = bali.version.nextVersion(version, level);
            const nextName = bali.name(['bali', 'examples', 'transaction', nextVersion]);

            // checkout a document of the next version of the contract
            const document = await repository.checkoutDocument(name, level);
            expect(document.getParameter('$version').isEqualTo(nextVersion)).is.true;

            // update and commit the next version of the contract in the repository
            document.setValue('$quantity', 20);
            document.setValue('$total', '26.07($currency: $USD)');
            await repository.commitDocument(nextName, document);

            // make sure the committed contract exists in the repository
            expect(document.isEqualTo(await repository.retrieveDocument(nextName))).is.true;
            expect((await repository.retrieveContract(name)).isEqualTo(await repository.retrieveContract(nextName))).is.false;

            // attempt to commit the same version of the contract in the repository
            await assert.rejects(async function() {
                await repository.commitDocument(nextName, document);
            });
        });

        it('should perform a message bag lifecycle', async function() {
            // create the bag
            const bag = '/bali/examples/bag/v1';
            const permissions = '/bali/permissions/public/v1';
            const capacity = 3;
            const lease = 60;  // seconds
            await repository.createBag(bag, permissions, capacity, lease);

            // make sure the message bag is empty
            expect(await repository.retrieveMessage(bag)).to.not.exist;

            // add some messages to the bag
            var message = bali.catalog();
            await repository.postMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(1);

            await repository.postMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(2);

            await repository.postMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(3);

            // attempt to add a message that puts the bag beyond its capacity
            await assert.rejects(async function() {
                await repository.postMessage(bag, message);
            });
            expect(await repository.messageCount(bag)).to.equal(3);

            // remove the messages from the bag
            message = await repository.retrieveMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(2);
            await repository.rejectMessage(message);
            expect(await repository.messageCount(bag)).to.equal(3);
            message = await repository.retrieveMessage(bag);
            await repository.acceptMessage(message);
            expect(await repository.messageCount(bag)).to.equal(2);

            message = await repository.retrieveMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(1);
            await repository.rejectMessage(message);
            expect(await repository.messageCount(bag)).to.equal(2);
            message = await repository.retrieveMessage(bag);
            await repository.acceptMessage(message);
            expect(await repository.messageCount(bag)).to.equal(1);

            message = await repository.retrieveMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(0);
            await repository.rejectMessage(message);
            expect(await repository.messageCount(bag)).to.equal(1);
            message = await repository.retrieveMessage(bag);
            await repository.acceptMessage(message);
            expect(await repository.messageCount(bag)).to.equal(0);

            // make sure the message bag is empty
            await assert.rejects(async function() {
                await repository.acceptMessage(message);
            });
            expect(await repository.retrieveMessage(bag)).to.not.exist;
        });

        it('should perform an event publication', async function() {
            // create the event bag
            const bag = '/bali/events/bag/v1';
            const permissions = '/bali/permissions/public/v1';
            await repository.createBag(bag, permissions);

            const tag = bali.tag();
            const now = bali.moment();
            const event = repository.createDocument(
                '/bali/examples/Event/v1',
                '/bali/permissions/public/v1', {
                    $tag: tag,
                    $timestamp: now
                }
            );
            await repository.publishEvent(event);
        });

        it('should reset the notary', async function() {
            await notary.forgetKey();
        });

    });

});
