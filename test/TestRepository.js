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
const repository = Repository.repository(storage, debug);
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
            const citation = await notary.activateKey(certificate);
            expect(citation.isEqualTo(await storage.writeDocument(certificate))).is.true;
            const tag = citation.getValue('$tag');
            const name = bali.component('/bali/certificates/' + tag.getValue() + '/v1');
            expect(citation.isEqualTo(await storage.writeName(name, citation))).is.true;
        });

        it('should perform a draft document lifecycle', async function() {
            // save a new draft to the repository
            const draft = await repository.createDocument('/bali/examples/FooBar/v1', {
                $foo: 'bar'
            });
            const citation = await repository.saveDraft(draft);

            // make sure the new draft exists in the repository
            expect(draft.isEqualTo(await repository.retrieveDraft(citation))).is.true;

            // discard the draft in the repository
            expect(await repository.discardDraft(citation)).is.true;

            // make sure the draft no longer exists in the repository
            expect(await repository.retrieveDraft(citation)).to.not.exist;

            // delete a non-existent draft from the repository
            expect(await repository.discardDraft(citation)).is.false;
        });

        it('should perform a committed document lifecycle', async function() {
            const document = transaction;

            // make sure the new document does not already exists in the repository
            expect(await repository.retrieveDocument(name)).to.not.exist;

            // save a draft of the document in the repository
            const citation = await repository.saveDraft(document);

            // make sure the new draft exists in the repository
            expect(document.isEqualTo(await repository.retrieveDraft(citation))).is.true;

            // commit the document in the repository
            expect(citation.isEqualTo(await repository.commitDocument(name, document))).is.true;

            // make sure the draft no longer exists in the repository
            expect(await repository.retrieveDraft(citation)).to.not.exist;

            // make sure the committed document exists in the repository
            expect(document.isEqualTo(await repository.retrieveDocument(name))).is.true;

            // attempt to commit the same version of the document in the repository
            await assert.rejects(async function() {
                await repository.commitDocument(name, document);
            });
        });

        it('should perform a versioned document lifecycle', async function() {
            const level = 2;
            const nextVersion = bali.version.nextVersion(version, level);
            const nextName = bali.name(['bali', 'examples', 'transaction', nextVersion]);

            // checkout the next version of the document
            const document = await repository.checkoutDocument(name, level);
            expect(document.getParameter('$version').isEqualTo(nextVersion)).is.true;

            // update and commit the next version of the document in the repository
            document.setValue('$quantity', 20);
            document.setValue('$total', '26.07($currency: $USD)');
            await repository.commitDocument(nextName, document);

            // make sure the committed document exists in the repository
            expect(document.isEqualTo(await repository.retrieveDocument(nextName))).is.true;
            expect(await repository.retrieveDocument(name).isEqualTo(await repository.retrieveDocument(nextName))).is.false;

            // attempt to commit the same version of the document in the repository
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
            expect(await repository.borrowMessage(bag)).to.not.exist;

            // add some messages to the bag
            var message = await repository.createMessage();
            await repository.addMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(1);

            message = await repository.createMessage();
            await repository.addMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(2);

            message = await repository.createMessage();
            await repository.addMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(3);

            // attempt to add a message that puts the bag beyond its capacity
            message = await repository.createMessage();
            await assert.rejects(async function() {
                await repository.addMessage(bag, message);
            });
            expect(await repository.messageCount(bag)).to.equal(3);

            // remove the messages from the bag
            message = await repository.borrowMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(2);
            await repository.returnMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(3);
            message = await repository.borrowMessage(bag);
            await repository.deleteMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(2);

            message = await repository.borrowMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(1);
            await repository.returnMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(2);
            message = await repository.borrowMessage(bag);
            await repository.deleteMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(1);

            message = await repository.borrowMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(0);
            await repository.returnMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(1);
            message = await repository.borrowMessage(bag);
            await repository.deleteMessage(bag, message);
            expect(await repository.messageCount(bag)).to.equal(0);

            // make sure the message bag is empty
            await assert.rejects(async function() {
                await repository.deleteMessage(bag, message);
            });
            expect(await repository.borrowMessage(bag)).to.not.exist;
        });

        it('should perform an event publication', async function() {
            const tag = bali.tag();
            const now = bali.moment();
            const event = await repository.createEvent({
                $tag: tag,
                $timestamp: now
            });
            await repository.publishEvent(event);
        });

        it('should reset the notary', async function() {
            await notary.forgetKey();
        });

    });

});
