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
    names: 'craterdog-bali-names-us-west-2',
    drafts: 'craterdog-bali-drafts-us-west-2',
    documents: 'craterdog-bali-documents-us-west-2',
    messages: 'craterdog-bali-messages-us-west-2'
};

const repositories = {
    'Local Storage': Repositories.repository(Repositories.local(notary, directory, debug), debug),
    'Cached Storage': Repositories.repository(Repositories.cached(Repositories.local(notary, directory, debug), debug), debug),
    'Validated Storage': Repositories.repository(Repositories.validated(notary, Repositories.local(notary, directory, debug), debug), debug),
    'Remote Storage': Repositories.repository(Repositories.remote(notary, uri, debug), debug),
    'S3 Storage': Repositories.repository(Repositories.s3(notary, configuration, debug), debug)
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
                expect(citation.isEqualTo(await repository.writeDocument(certificate))).is.true;
            });

            it('should perform a named document lifecycle', async function() {
                const name = bali.component('/bali/certificates/' + tag.getValue() + '/v1');

                // make sure the new name does not yet exist in the repository
                expect(await repository.nameExists(name)).is.false;
                expect(await repository.readName(name)).to.not.exist;

                // create a new name in the repository
                await repository.writeName(name, citation);

                // make sure the new name exists in the repository
                expect(await repository.nameExists(name)).is.true;

                // fetch the named document from the repository
                expect(certificate.isEqualTo(await repository.readName(name))).is.true;
            });

            it('should perform a draft document lifecycle', async function() {
                tag = transaction.getParameter('$tag');
                version = transaction.getParameter('$version');
                const draft = await notary.notarizeDocument(transaction);
                citation = await notary.citeDocument(draft);

                // create a new draft in the repository
                expect(citation.isEqualTo(await repository.writeDraft(draft))).is.true;

                // make sure the new draft exists in the repository
                expect(await repository.draftExists(tag, version)).is.true;

                // make sure the same document does not exist in the repository
                expect(await repository.documentExists(tag, version)).is.false;

                // fetch the new draft from the repository
                expect(draft.isEqualTo(await repository.readDraft(tag, version))).is.true;

                // update the existing draft in the repository
                expect(citation.isEqualTo(await repository.writeDraft(draft))).is.true;

                // make sure the updated draft exists in the repository
                expect(await repository.draftExists(tag, version)).is.true;

                // delete the draft from the repository
                expect(draft.isEqualTo(await repository.deleteDraft(tag, version))).is.true;

                // make sure the draft no longer exists in the repository
                expect(await repository.draftExists(tag, version)).is.false;
                expect(await repository.readDraft(tag, version)).to.not.exist;

                // delete a non-existent draft from the repository
                expect(await repository.deleteDraft(tag, version)).to.not.exist;

            });

            it('should perform a committed document lifecycle', async function() {
                tag = transaction.getParameter('$tag');
                version = transaction.getParameter('$version');
                const document = await notary.notarizeDocument(transaction);
                citation = await notary.citeDocument(document);

                // make sure the new document does not already exists in the repository
                expect(await repository.documentExists(tag, version)).is.false;
                expect(await repository.readDocument(tag, version)).to.not.exist;

                // create a new document in the repository
                expect(citation.isEqualTo(await repository.writeDocument(document))).is.true;

                // make sure the same draft does not exist in the repository
                expect(await repository.draftExists(tag, version)).is.false;
                expect(await repository.readDraft(tag, version)).to.not.exist;

                // make sure the new document exists in the repository
                expect(await repository.documentExists(tag, version)).is.true;

                // fetch the new document from the repository
                expect(document.isEqualTo(await repository.readDocument(tag, version))).is.true;

                // make sure the new document still exists in the repository
                expect(await repository.documentExists(tag, version)).is.true;

                // attempt to create the same document in the repository
                await assert.rejects(async function() {
                    await repository.writeDocument(document);
                });

            });

            it('should perform a message bag lifecycle', async function() {
                // create the bag
                const tag = bali.tag();
                const version = bali.version();
                const bag = await notary.notarizeDocument(bali.catalog({
                        $description: 'This is an example bag.'
                    }, {
                        $type: '/bali/examples/Bag/v1',
                        $tag: tag,
                        $version: version,
                        $permissions: '/bali/permissions/public/v1',
                        $previous: bali.pattern.NONE
                    })
                );
                await repository.writeDocument(bag);

                // make sure the message bag is empty
                expect(await repository.messageCount(tag, version)).to.equal(0);
                expect(await repository.removeMessage(tag, version)).to.not.exist;

                // add some messages to the bag
                const generateMessage = async function(count) {
                    const content = bali.catalog({
                        $count: count
                    }, {
                        $type: '/bali/examples/Message/v1',
                        $tag: bali.tag(),
                        $version: bali.version(),
                        $permissions: '/bali/permissions/public/v1',
                        $previous: bali.pattern.NONE
                    });
                    return await notary.notarizeDocument(content);
                };

                var message = await generateMessage(1);
                if (debug > 0) console.log('message 1: ' + message);
                citation = await notary.citeDocument(message);
                expect(citation.isEqualTo(await repository.addMessage(tag, version, message))).is.true;
                expect(await repository.messageCount(tag, version)).to.equal(1);

                message = await generateMessage(2);
                if (debug > 0) console.log('message 2: ' + message);
                citation = await notary.citeDocument(message);
                expect(citation.isEqualTo(await repository.addMessage(tag, version, message))).is.true;
                expect(await repository.messageCount(tag, version)).to.equal(2);

                message = await generateMessage(3);
                if (debug > 0) console.log('message 3: ' + message);
                citation = await notary.citeDocument(message);
                expect(citation.isEqualTo(await repository.addMessage(tag, version, message))).is.true;
                expect(await repository.messageCount(tag, version)).to.equal(3);

                // remove the messages from the bag
                message = await repository.removeMessage(tag, version);
                if (debug > 0) console.log('message 1: ' + message);
                expect(await repository.messageCount(tag, version)).to.equal(2);

                message = await repository.removeMessage(tag, version);
                if (debug > 0) console.log('message 2: ' + message);
                expect(await repository.messageCount(tag, version)).to.equal(1);

                message = await repository.removeMessage(tag, version);
                if (debug > 0) console.log('message 3: ' + message);
                expect(await repository.messageCount(tag, version)).to.equal(0);

                // make sure the message bag is empty
                expect(await repository.removeMessage(tag, version)).to.not.exist;

            });

            it('should reset the notary', async function() {
                await notary.forgetKey();
            });

        });

    }

});
