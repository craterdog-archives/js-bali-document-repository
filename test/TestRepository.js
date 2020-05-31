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

const transaction = bali.catalog({
    $timestamp: bali.moment(),
    $product: 'Snickers Bar',
    $quantity: 10,
    $price: '1.25($currency: $USD)',
    $tax: '1.07($currency: $USD)',
    $total: '13.57($currency: $USD)'
}, {
    $type: '/bali/examples/Transaction/v1',
    $tag: bali.tag(),
    $version: version,
    $permissions: '/bali/permissions/public/v1',
    $previous: bali.pattern.NONE
});


describe('Bali Document Repository™', function() {

    describe('Test Document Repository', function() {

        it('should create a self-signed certificate', async function() {
            const publicKey = await notary.generateKey();
            const certificate = await notary.notarizeDocument(publicKey);
            const certificateCitation = await notary.activateKey(certificate);
            console.log('certificate citation: ' + certificateCitation);
            //expect(certificateCitation.isEqualTo(await storage.writeDocument(certificate))).is.true;
            console.log('write citation: ' + (await storage.writeDocument(certificate)));
        });

        it('should perform a draft document lifecycle', async function() {
            // save a new draft to the repository
            const draft = await repository.createDraft(
                '/bali/examples/FooBar/v1',
                '/bali/permissions/public/v1', {
                    $foo: 'bar'
                }
            );
            console.log('draft: ' + draft);
            const draftCitation = await repository.saveDraft(draft);

            // make sure the new draft exists in the repository
            expect(draft.isEqualTo(await repository.retrieveDraft(draftCitation))).is.true;

            // discard the draft in the repository
            expect(await repository.discardDraft(draftCitation)).is.true;

            // make sure the draft no longer exists in the repository
            expect(await repository.retrieveDraft(draftCitation)).to.not.exist;

            // delete a non-existent draft from the repository
            expect(await repository.discardDraft(draftCitation)).is.false;
        });

        it('should perform a committed document lifecycle', async function() {
            const draft = transaction;

            // make sure the new document does not already exists in the repository
            expect(await repository.retrieveDocument(name)).to.not.exist;

            // save a draft of the document in the repository
            const draftCitation = await repository.saveDraft(draft);

            // make sure the new draft exists in the repository
            expect(draft.isEqualTo(await repository.retrieveDraft(draftCitation))).is.true;

            // commit the document in the repository
            const documentCitation = await repository.commitDocument(name, draft);
            expect(documentCitation.isEqualTo(draftCitation)).is.false;

            // make sure the draft no longer exists in the repository
            expect(await repository.retrieveDraft(draftCitation)).to.not.exist;

            // make sure the committed document exists in the repository
            expect(draft.isEqualTo(await repository.retrieveDocument(name))).is.true;

            // attempt to commit the same version of the document in the repository
            await assert.rejects(async function() {
                await repository.commitDocument(name, draft);
            });
        });

        it('should perform a versioned document lifecycle', async function() {
            const level = 2;
            const nextVersion = bali.version.nextVersion(version, level);
            const nextName = bali.name(['bali', 'examples', 'transaction', nextVersion]);

            // checkout a draft of the next version of the document
            const draft = await repository.checkoutDocument(name, level);
            expect(draft.getParameter('$version').isEqualTo(nextVersion)).is.true;

            // update and commit the next version of the document in the repository
            draft.setValue('$quantity', 20);
            draft.setValue('$total', '26.07($currency: $USD)');
            await repository.commitDocument(nextName, draft);

            // make sure the committed document exists in the repository
            expect(draft.isEqualTo(await repository.retrieveDocument(nextName))).is.true;
            expect((await repository.retrieveDocument(name)).isEqualTo(await repository.retrieveDocument(nextName))).is.false;

            // attempt to commit the same version of the document in the repository
            await assert.rejects(async function() {
                await repository.commitDocument(nextName, draft);
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
            expect(await repository.receiveMessage(bag)).to.not.exist;

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
            message = await repository.receiveMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(2);
            await repository.rejectMessage(message);
            expect(await repository.messageCount(bag)).to.equal(3);
            message = await repository.receiveMessage(bag);
            await repository.acceptMessage(message);
            expect(await repository.messageCount(bag)).to.equal(2);

            message = await repository.receiveMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(1);
            await repository.rejectMessage(message);
            expect(await repository.messageCount(bag)).to.equal(2);
            message = await repository.receiveMessage(bag);
            await repository.acceptMessage(message);
            expect(await repository.messageCount(bag)).to.equal(1);

            message = await repository.receiveMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(0);
            await repository.rejectMessage(message);
            expect(await repository.messageCount(bag)).to.equal(1);
            message = await repository.receiveMessage(bag);
            await repository.acceptMessage(message);
            expect(await repository.messageCount(bag)).to.equal(0);

            // make sure the message bag is empty
            await assert.rejects(async function() {
                await repository.acceptMessage(message);
            });
            expect(await repository.receiveMessage(bag)).to.not.exist;
        });

        it('should perform an event publication', async function() {
            // create the event bag
            const bag = '/bali/events/bag/v1';
            const permissions = '/bali/permissions/public/v1';
            const capacity = 3;
            const lease = 60;  // seconds
            await repository.createBag(bag, permissions, capacity, lease);

            const tag = bali.tag();
            const now = bali.moment();
            const event = await repository.createDraft(
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
