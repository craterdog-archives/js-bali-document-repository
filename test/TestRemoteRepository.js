/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = false;  // set to true for exception logging
const mocha = require('mocha');
const assert = require('chai').assert;
const expect = require('chai').expect;
const bali = require('bali-component-framework');
const accountTag = bali.parse('#GTDHQ9B8ZGS7WCBJJJBFF6KDCCF55R2P');
const directory = 'test/config/';
const url = bali.reference('http://localhost:3000');
const securityModule = require('bali-digital-notary').ssm(directory + accountTag.getValue() + '.keys', debug);
const notary = require('bali-digital-notary').api(securityModule, accountTag, directory, debug);
const repository = require('../index').remote(notary, url, debug);

const transaction = bali.catalog({
    $timestamp: bali.moment(),
    $product: bali.text('Snickers Bar'),
    $quantity: 10,
    $price: bali.parse('1.25($USD)'),
    $tax: bali.parse('1.07($USD)'),
    $total: bali.parse('13.57($USD)')
}, bali.parameters({
    $tag: bali.tag(),
    $version: bali.version(),
    $permissions: bali.parse('/bali/permissions/public/v1'),
    $previous: bali.pattern.NONE
}));

const source = transaction.toString();

function extractId(component) {
    const parameters = component.getValue('$component').getParameters();
    const identifier = parameters.getParameter('$tag').getValue();
    const version = parameters.getParameter('$version');
    return '' + identifier + version;
}

describe('Bali Nebula™ Document Repository', function() {

    describe('Test Remote Repository', function() {

        it('should perform a citation name lifecycle', async function() {
            const name = 'bali/examples/name/v1.2.3.4';

            // generate a new notary key
            const catalog = await notary.generateKey();
            expect(catalog).to.exist;
            const certificate = await notary.signComponent(catalog);
            expect(certificate).to.exist;
            var citation = await notary.activateKey(certificate);
            expect(citation).to.exist;

            // save the new certificate in the repository
            const certificateId = extractId(certificate);
            await repository.createDocument(certificateId, certificate);

            // make sure the new name does not yet exist in the repository
            var exists = await repository.citationExists(name);
            expect(exists).is.false;

            // create a new name in the repository
            await repository.createCitation(name, source);

            // make sure the new name exists in the repository
            exists = await repository.citationExists(name);
            expect(exists).is.true;

            // fetch the new citation from the repository
            citation = await repository.fetchCitation(name);
            expect(citation).to.equal(source);
        });

        it('should perform a draft document lifecycle', async function() {
            const identifier = 'PLR85ZV07WQ6K178XLMZSJ14NLZ03QCQv1.2.3';

            // create a new draft in the repository
            await repository.saveDraft(identifier, source);

            // make sure the new draft exists in the repository
            var exists = await repository.draftExists(identifier);
            expect(exists).is.true;

            // make sure the same document does not exist in the repository
            exists = await repository.documentExists(identifier);
            expect(exists).is.false;

            // fetch the new draft from the repository
            const draft = await repository.fetchDraft(identifier);
            expect(draft).to.equal(source);

            // delete the new draft from the repository
            await repository.deleteDraft(identifier);

            // make sure the new draft no longer exists in the repository
            exists = await repository.draftExists(identifier);
            expect(exists).is.false;

            // delete a non-existent draft from the repository
            await repository.deleteDraft(identifier);

        });

        it('should perform a committed document lifecycle', async function() {
            const identifier = 'YJM0T2PPPKQTCL0VTTBDH7V54XCHHKZAv3.4';

            // create a new document in the repository
            await repository.createDocument(identifier, source);

            // make sure the same draft does not exist in the repository
            var exists = await repository.draftExists(identifier);
            expect(exists).is.false;

            // make sure the new document exists in the repository
            exists = await repository.documentExists(identifier);
            expect(exists).is.true;

            // fetch the new document from the repository
            const document = await repository.fetchDocument(identifier);
            expect(document).to.equal(source);

            // make sure the new document still exists in the repository
            exists = await repository.documentExists(identifier);
            expect(exists).is.true;

            // attempt to create the same document in the repository
            try {
                await repository.createDocument(identifier, source);
                assert.fail('The attempt to create the same document should have failed.');
            } catch (error) {
                // expected
            };

        });

        it('should perform a message queue lifecycle', async function() {
            const queueId = 'JW1FBS2SJ8N8QQRNDDWGD7H8Z2NN0LDG';

            // make sure the message queue is empty
            var none = await repository.dequeueMessage(queueId);
            expect(none).to.not.exist;

            // queue up some messages
            await repository.queueMessage(queueId, "$first");
            await repository.queueMessage(queueId, "$second");
            await repository.queueMessage(queueId, "$third");

            // dequeue the messages
            var message = await repository.dequeueMessage(queueId);
            expect(message).to.exist;
            message = await repository.dequeueMessage(queueId);
            expect(message).to.exist;
            message = await repository.dequeueMessage(queueId);
            expect(message).to.exist;

            // make sure the message queue is empty
            none = await repository.dequeueMessage(queueId);
            expect(none).to.not.exist;

        });

    });

});
