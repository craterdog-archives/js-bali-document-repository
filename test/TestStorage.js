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
//const uri = 'https://bali-nebula.net';
const uri = 'http://localhost:3000';
const Storage = require('../');

const configuration = {
    names: 'bali-nebula-names-us-east-1',
    drafts: 'bali-nebula-drafts-us-east-1',
    documents: 'bali-nebula-documents-us-east-1',
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
            var citation;
            var certificate;

            it('should create a self-signed certificate', async function() {
                const publicKey = await notary.generateKey();
                certificate = await notary.notarizeDocument(publicKey);
                citation = await notary.activateKey(certificate);
                expect(citation.isEqualTo(await storage.writeDocument(certificate))).is.true;
            });

            it('should perform a named document lifecycle', async function() {
                const tag = citation.getValue('$tag');
                const name = bali.component('/bali/certificates/' + tag.getValue() + '/v1');

                // make sure the new name does not yet exist in the repository
                expect(await storage.nameExists(name)).is.false;
                expect(await storage.readName(name)).to.not.exist;

                // create a new name in the repository
                expect(citation.isEqualTo(await storage.writeName(name, citation))).to.equal(true);

                // make sure the new name exists in the repository
                expect(await storage.nameExists(name)).is.true;

                // fetch the named document from the repository
                expect(citation.isEqualTo(await storage.readName(name))).is.true;
            });

            it('should perform a draft document lifecycle', async function() {
                const draft = await notary.notarizeDocument(transaction);
                citation = await notary.citeDocument(draft);

                // create a new draft in the repository
                expect(citation.isEqualTo(await storage.writeDraft(draft))).is.true;

                // make sure the new draft exists in the repository
                expect(await storage.draftExists(citation)).is.true;

                // make sure the same document does not exist in the repository
                expect(await storage.documentExists(citation)).is.false;

                // fetch the new draft from the repository
                expect(draft.isEqualTo(await storage.readDraft(citation))).is.true;

                // update the existing draft in the repository
                expect(citation.isEqualTo(await storage.writeDraft(draft))).is.true;

                // make sure the updated draft exists in the repository
                expect(await storage.draftExists(citation)).is.true;

                // delete the draft from the repository
                expect(draft.isEqualTo(await storage.deleteDraft(citation))).is.true;

                // make sure the draft no longer exists in the repository
                expect(await storage.draftExists(citation)).is.false;
                expect(await storage.readDraft(citation)).to.not.exist;

                // delete a non-existent draft from the repository
                expect(await storage.deleteDraft(citation)).to.not.exist;

            });

            it('should perform a committed document lifecycle', async function() {
                const document = await notary.notarizeDocument(transaction);
                citation = await notary.citeDocument(document);

                // make sure the new document does not already exists in the repository
                expect(await storage.documentExists(citation)).is.false;
                expect(await storage.readDocument(citation)).to.not.exist;

                // create a new document in the repository
                expect(citation.isEqualTo(await storage.writeDocument(document))).is.true;

                // make sure the same draft does not exist in the repository
                expect(await storage.draftExists(citation)).is.false;
                expect(await storage.readDraft(citation)).to.not.exist;

                // make sure the new document exists in the repository
                expect(await storage.documentExists(citation)).is.true;

                // fetch the new document from the repository
                expect(document.isEqualTo(await storage.readDocument(citation))).is.true;

                // make sure the new document still exists in the repository
                expect(await storage.documentExists(citation)).is.true;

                // attempt to create the same document in the repository
                await assert.rejects(async function() {
                    await storage.writeDocument(document);
                });

            });

            it('should perform a message bag lifecycle', async function() {
                // create the bag
                const document = await notary.notarizeDocument(bali.catalog({
                        $description: 'This is an example bag.'
                    }, {
                        $type: '/bali/examples/Bag/v1',
                        $tag: bali.tag(),
                        $version: bali.version(),
                        $permissions: '/bali/permissions/public/v1',
                        $previous: bali.pattern.NONE
                    })
                );
                const bag = await storage.writeDocument(document);

                // name the bag
                const name = bali.component('/bali/examples/' + bag.getValue('$tag').toString().slice(1) + '/v1');
                expect(bag.isEqualTo(await storage.writeName(name, bag))).to.equal(true);

                // make sure the message bag is empty
                expect(await storage.messageAvailable(bag)).to.equal(false);
                expect(await storage.borrowMessage(bag)).to.not.exist;

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

                const extractTag = function(message) {
                    const content = message.getValue('$content');
                    const tag = content.getParameter('$tag');
                    return tag;
                };

                var message = await generateMessage(1);
                var tag = extractTag(message);
                expect(tag.isEqualTo(await storage.addMessage(bag, message))).is.true;
                expect(await storage.messageAvailable(bag)).to.equal(true);

                message = await generateMessage(2);
                tag = extractTag(message);
                expect(tag.isEqualTo(await storage.addMessage(bag, message))).is.true;
                expect(await storage.messageAvailable(bag)).to.equal(true);

                message = await generateMessage(3);
                tag = extractTag(message);
                expect(tag.isEqualTo(await storage.addMessage(bag, message))).is.true;
                expect(await storage.messageAvailable(bag)).to.equal(true);

                // remove the messages from the bag
                message = await storage.borrowMessage(bag);
                tag = extractTag(message);
                await storage.deleteMessage(bag, tag);
                expect(await storage.messageAvailable(bag)).to.equal(true);

                message = await storage.borrowMessage(bag);
                tag = extractTag(message);
                await storage.deleteMessage(bag, tag);
                expect(await storage.messageAvailable(bag)).to.equal(true);

                message = await storage.borrowMessage(bag);
                await storage.returnMessage(bag, message);
                expect(await storage.messageAvailable(bag)).to.equal(true);

                message = await storage.borrowMessage(bag);
                tag = extractTag(message);
                await storage.deleteMessage(bag, tag);
                expect(await storage.messageAvailable(bag)).to.equal(false);

                // make sure the message bag is empty
                expect(await storage.borrowMessage(bag)).to.not.exist;

            });

            it('should reset the notary', async function() {
                await notary.forgetKey();
            });

        });

    }

});
