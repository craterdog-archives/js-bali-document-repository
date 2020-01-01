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
//const uri = 'https://bali-nebula.net/repository';
const uri = 'http://localhost:3000';
const Repositories = require('../');

const configuration = {
    citations: 'craterdog-bali-citations-us-west-2',
    drafts: 'craterdog-bali-drafts-us-west-2',
    documents: 'craterdog-bali-documents-us-west-2',
    queues: 'craterdog-bali-queues-us-west-2'
};

const repositories = {
    'Local Storage': Repositories.repository(Repositories.local(directory, debug), debug),
    'Cached Storage': Repositories.repository(Repositories.cached(Repositories.local(directory, debug), debug), debug),
    'Validated Storage': Repositories.repository(Repositories.validated(notary, Repositories.local(directory, debug), debug), debug),
    'Remote Storage': Repositories.repository(Repositories.remote(notary, uri, debug), debug),
    'S3 Storage': Repositories.repository(Repositories.s3(configuration, debug), debug)
};


describe('Bali Nebula™ Document Repository', function() {

    for (var key in repositories) {
        const repository = repositories[key];

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
            $version: bali.version(),
            $permissions: '/bali/permissions/public/v1',
            $previous: bali.pattern.NONE
        });

        describe('Test ' + key, function() {
            var tag;
            var version;
            var citation;
            var certificate;

            it('should create a self-signed certificate', async function() {
                certificate = await notary.generateKey();
                tag = certificate.getParameter('$tag');
                version = certificate.getParameter('$version');
                certificate = await notary.notarizeDocument(certificate);
                citation = await notary.activateKey(certificate);
                await repository.createDocument(certificate);
            });

            it('should perform a citation name lifecycle', async function() {
                const name = bali.component('/bali/certificates/' + tag.getValue() + '/v1');

                // make sure the new name does not yet exist in the repository
                var exists = await repository.citationExists(name);
                expect(exists).is.false;
                var none = await repository.fetchCitation(name);
                expect(none).to.not.exist;

                // create a new name in the repository
                await repository.createCitation(name, citation);

                // make sure the new name exists in the repository
                exists = await repository.citationExists(name);
                expect(exists).is.true;

                // fetch the new citation from the repository
                const result = await repository.fetchCitation(name);
                expect(citation.isEqualTo(result)).is.true;
            });

            it('should perform a draft document lifecycle', async function() {
                tag = transaction.getParameter('$tag');
                version = transaction.getParameter('$version');
                const draft = await notary.notarizeDocument(transaction);

                // create a new draft in the repository
                await repository.saveDraft(draft);

                // make sure the new draft exists in the repository
                var exists = await repository.draftExists(tag, version);
                expect(exists).is.true;

                // make sure the same document does not exist in the repository
                exists = await repository.documentExists(tag, version);
                expect(exists).is.false;

                // fetch the new draft from the repository
                const result = await repository.fetchDraft(tag, version);
                expect(draft.isEqualTo(result)).is.true;

                // update the existing draft in the repository
                await repository.saveDraft(draft);

                // make sure the updated draft exists in the repository
                var exists = await repository.draftExists(tag, version);
                expect(exists).is.true;

                // delete the draft from the repository
                const deleted = await repository.deleteDraft(tag, version);
                expect(draft.isEqualTo(deleted)).is.true;

                // make sure the draft no longer exists in the repository
                exists = await repository.draftExists(tag, version);
                expect(exists).is.false;
                var none = await repository.fetchDraft(tag, version);
                expect(none).to.not.exist;

                // delete a non-existent draft from the repository
                none = await repository.deleteDraft(tag, version);
                expect(none).to.not.exist;

            });

            it('should perform a committed document lifecycle', async function() {
                tag = transaction.getParameter('$tag');
                version = transaction.getParameter('$version');
                const document = await notary.notarizeDocument(transaction);

                // make sure the new document does not already exists in the repository
                exists = await repository.documentExists(tag, version);
                expect(exists).is.false;
                var none = await repository.fetchDocument(tag, version);
                expect(none).to.not.exist;

                // create a new document in the repository
                await repository.createDocument(document);

                // make sure the same draft does not exist in the repository
                var exists = await repository.draftExists(tag, version);
                expect(exists).is.false;
                none = await repository.fetchDraft(tag, version);
                expect(none).to.not.exist;

                // make sure the new document exists in the repository
                exists = await repository.documentExists(tag, version);
                expect(exists).is.true;

                // fetch the new document from the repository
                const result = await repository.fetchDocument(tag, version);
                expect(document.isEqualTo(result)).is.true;

                // make sure the new document still exists in the repository
                exists = await repository.documentExists(tag, version);
                expect(exists).is.true;

                // attempt to create the same document in the repository
                await assert.rejects(async function() {
                    await repository.createDocument(document);
                });

            });

            it('should perform a message queue lifecycle', async function() {
                const queue = bali.tag();

                // make sure the queue does not exist
                var exists = await repository.queueExists(queue);
                expect(exists).is.false;

                // make sure the message queue is empty
                var count = await repository.messageCount(queue);
                expect(count).to.equal(0);
                var none = await repository.dequeueMessage(queue);
                expect(none).to.not.exist;

                // queue up some messages
                var message = await notary.notarizeDocument(transaction);
                await repository.queueMessage(queue, message);
                count = await repository.messageCount(queue);
                expect(count).to.equal(1);
                await repository.queueMessage(queue, message);
                count = await repository.messageCount(queue);
                expect(count).to.equal(2);
                await repository.queueMessage(queue, message);
                count = await repository.messageCount(queue);
                expect(count).to.equal(3);

                // make sure the queue does exist
                exists = await repository.queueExists(queue);
                expect(exists).is.true;

                // dequeue the messages
                var result = await repository.dequeueMessage(queue);
                expect(result).to.exist;
                expect(message.isEqualTo(result)).is.true;
                count = await repository.messageCount(queue);
                expect(count).to.equal(2);
                result = await repository.dequeueMessage(queue);
                expect(result).to.exist;
                expect(message.isEqualTo(result)).is.true;
                count = await repository.messageCount(queue);
                expect(count).to.equal(1);
                result = await repository.dequeueMessage(queue);
                expect(result).to.exist;
                expect(message.isEqualTo(result)).is.true;
                count = await repository.messageCount(queue);
                expect(count).to.equal(0);

                // make sure the message queue is empty
                none = await repository.dequeueMessage(queue);
                expect(none).to.not.exist;

                // make sure the queue does not exist
                exists = await repository.queueExists(queue);
                expect(exists).is.false;

            });

            it('should reset the notary', async function() {
                await notary.forgetKey();
            });

        });

    }

});
