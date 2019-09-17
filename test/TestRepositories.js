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
const directory = 'test/config/';
const mocha = require('mocha');
const assert = require('chai').assert;
const expect = require('chai').expect;
const bali = require('bali-component-framework').api();
const account = bali.tag();
const api = require('bali-digital-notary');
const securityModule = api.ssm(directory);
const notary = api.notary(securityModule, account, directory);
const Repositories = require('../index');

const repositories = {
    'Local Repository': Repositories.local(directory, debug),
    'Cached Repository': Repositories.cached(Repositories.local(directory, debug), debug),
    'Validated Repository': Repositories.validated(notary, Repositories.local(directory, debug), debug)
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
        }, bali.parameters({
            $tag: bali.tag(),
            $version: bali.version(),
            $permissions: '/bali/permissions/public/v1',
            $previous: bali.pattern.NONE
        }));

        describe('Test ' + key, function() {
            var tag;
            var certificate;
            var citation;
    
            it('should create a self-signed certificate', async function() {
                certificate = await notary.generateKey();
                certificate = await notary.notarizeDocument(certificate);
                citation = await notary.activateKey(certificate);
                tag = citation.getValue('$tag');
                const certificateId = extractId(certificate);
                await repository.createDocument(certificateId, certificate);
            });
    
            it('should perform a citation name lifecycle', async function() {
                const name = '/bali/certificates/' + tag + '/v1';
    
                // make sure the new name does not yet exist in the repository
                var exists = await repository.citationExists(name);
                expect(exists).is.false;
    
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
                const draft = await notary.notarizeDocument(transaction);
                const draftId = extractId(draft);
    
                // create a new draft in the repository
                await repository.saveDraft(draftId, draft);
    
                // make sure the new draft exists in the repository
                var exists = await repository.draftExists(draftId);
                expect(exists).is.true;
    
                // make sure the same document does not exist in the repository
                exists = await repository.documentExists(draftId);
                expect(exists).is.false;
    
                // fetch the new draft from the repository
                const result = await repository.fetchDraft(draftId);
                expect(draft.isEqualTo(result)).is.true;
    
                // delete the new draft from the repository
                await repository.deleteDraft(draftId);
    
                // make sure the new draft no longer exists in the repository
                exists = await repository.draftExists(draftId);
                expect(exists).is.false;
    
                // delete a non-existent draft from the repository
                await repository.deleteDraft(draftId);
    
            });
    
            it('should perform a committed document lifecycle', async function() {
                const document = await notary.notarizeDocument(transaction);
                const documentId = extractId(document);
    
                // create a new document in the repository
                await repository.createDocument(documentId, document);
    
                // make sure the same draft does not exist in the repository
                var exists = await repository.draftExists(documentId);
                expect(exists).is.false;
    
                // make sure the new document exists in the repository
                exists = await repository.documentExists(documentId);
                expect(exists).is.true;
    
                // fetch the new document from the repository
                const result = await repository.fetchDocument(documentId);
                expect(document.isEqualTo(result)).is.true;
    
                // make sure the new document still exists in the repository
                exists = await repository.documentExists(documentId);
                expect(exists).is.true;
    
                // attempt to create the same document in the repository
                try {
                    await repository.createDocument(documentId, document);
                    assert.fail('The attempt to create the same document should have failed.');
                } catch (error) {
                    // expected
                };
    
            });
    
            it('should perform a message queue lifecycle', async function() {
                const queueId = bali.tag().getValue();
                const message = await notary.notarizeDocument(transaction);
                const messageId = extractId(message);
    
    
                // make sure the message queue is empty
                var none = await repository.dequeueMessage(queueId);
                expect(none).to.not.exist;
    
                // queue up some messages
                await repository.queueMessage(queueId, message);
                await repository.queueMessage(queueId, message);
                await repository.queueMessage(queueId, message);
    
                // dequeue the messages
                var result = await repository.dequeueMessage(queueId);
                expect(result).to.exist;
                expect(message.isEqualTo(result)).is.true;
                result = await repository.dequeueMessage(queueId);
                expect(result).to.exist;
                expect(message.isEqualTo(result)).is.true;
                result = await repository.dequeueMessage(queueId);
                expect(result).to.exist;
                expect(message.isEqualTo(result)).is.true;
    
                // make sure the message queue is empty
                none = await repository.dequeueMessage(queueId);
                expect(none).to.not.exist;
    
            });
    
            it('should reset the notary', async function() {
                await notary.forgetKey();
            });
    
        });

    }

});

const extractId = function(catalog) {
    var tag, version;
    const component = catalog.getValue('$component');
    if (component) {
        tag = component.getParameter('$tag');
        version = component.getParameter('$version');
    } else {
        tag = catalog.getValue('$tag');
        version = catalog.getValue('$version');
    }
    const id = tag.getValue() + version;
    return id;
};

