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
 * This class implements a storage mechanism wrapper that validates all documents prior to
 * storing them in the wrapped storage mechanism and after retrieving them from the wrapped
 * storage mechanism.  The documents are validated using the public certificate of the
 * notary key used to notarize them.
 */


// PUBLIC FUNCTIONS

/**
 * This function creates a new instance of a validated storage mechanism.  A backend repository
 * is passed in and is used as the repository for all documents.
 *
 * @param {DigitalNotary} notary The digital notary to be used to validate the documents.
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
    // validate the arguments
    if (debug === null || debug === undefined) debug = 0;  // default is off
    const bali = require('bali-component-framework').api(debug);
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

    this.citationExists = async function(name) {
        try {
            return await repository.citationExists(name);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$citationExists',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $name: name,
                $text: 'An unexpected error occurred while checking whether or not a citation exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readCitation = async function(name) {
        try {
            const citation = await repository.readCitation(name);
            if (citation) await validateCitation(citation);
            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$readCitation',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $name: name,
                $text: 'An unexpected error occurred while attempting to read a citation from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeCitation = async function(name, citation) {
        try {
            await validateCitation(citation);
            await repository.writeCitation(name, citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$writeCitation',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $name: name,
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to write a citation to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.draftExists = async function(tag, version) {
        try {
            return await repository.draftExists(tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$draftExists',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while checking whether or not a draft exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDraft = async function(tag, version) {
        try {
            const draft = await repository.readDraft(tag, version);
            if (draft) await validateDocument(draft);
            return draft;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$readDraft',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to read a draft from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDraft = async function(draft) {
        try {
            await validateDocument(draft);
            return await repository.writeDraft(draft);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$writeDraft',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to write a draft to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.deleteDraft = async function(tag, version) {
        try {
            return await repository.deleteDraft(tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$deleteDraft',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to delete a draft from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.documentExists = async function(tag, version) {
        try {
            return await repository.documentExists(tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while checking whether or not a document exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDocument = async function(tag, version) {
        try {
            const document = await repository.readDocument(tag, version);
            if (document) await validateDocument(document);
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to read a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDocument = async function(document) {
        try {
            await validateDocument(document);
            return await repository.writeDocument(document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $document: document,
                $text: 'An unexpected error occurred while attempting to write a document to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.bagExists = async function(bag) {
        try {
            return await repository.bagExists(bag);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$bagExists',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to check whether or not a message bag exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.messageCount = async function(bag) {
        try {
            return await repository.messageCount(bag);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$messageCount',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to check the number of messages that are on a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.addMessage = async function(bag, message) {
        try {
            await validateMessage(message);
            return await repository.addMessage(bag, message);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$addMessage',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $bag: bag,
                $message: message,
                $text: 'An unexpected error occurred while attempting to add a message to a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.removeMessage = async function(bag) {
        try {
            const message = await repository.removeMessage(bag);
            if (message) await validateMessage(message);
            return message;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$removeMessage',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to remove a message from a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    // PRIVATE FUNCTIONS

    /**
     * This function validates the specified document citation against a document to make sure
     * that the citation digest was generated from the same document.  If not, an exception is
     * thrown.
     *
     * @param {Catalog} citation The document citation to be validated.
     * @returns {Catalog} The validated document cited by the citation.
     * @throws {Exception} The digest generated for the document does not match the digest
     * contained within the document citation.
     */
    const validateCitation = async function(citation) {
        try {
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            const document = await repository.readDocument(tag, version);
            if (!document) {
                const exception = bali.exception({
                    $module: '/bali/repositories/ValidatedStorage',
                    $procedure: '$validateCitation',
                    $exception: '$missingDocument',
                    $citation: citation,
                    $text: 'The cited document does not exist.'
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }
            await validateDocument(document);
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
                if (debug) console.error(exception.toString());
                throw exception;
            }
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$validateCitation',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to validate a citation.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };


    /**
     * This function validates a notarized document. It makes sure that all notary seals
     * attached to the document are valid. If any seal is not valid an exception is thrown.
     *
     * @param {Catalog} document The notarized document to be validated.
     * @throws {Exception} The document is not valid.
     */
    const validateDocument = async function(document) {
        try {
            // make sure it really is a notarized document
            const content = document.getValue('$content');
            const certificateCitation = document.getValue('$certificate');
            const signature = document.getValue('$signature');
            if (!content || !certificateCitation || !signature) {
                const exception = bali.exception({
                    $module: '/bali/repositories/ValidatedStorage',
                    $procedure: '$validateDocument',
                    $exception: '$documentInvalid',
                    $document: document,
                    $text: 'The document is not notarized.'
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // validate the previous version of the document if one exists
            const previousCitation = content.getParameter('$previous');
            if (previousCitation && !previousCitation.isEqualTo(bali.pattern.NONE)) {
                await validateCitation(previousCitation);
            }

            // validate the certificate if one exists
            var certificate;
            if (certificateCitation && !certificateCitation.isEqualTo(bali.pattern.NONE)) {
                certificate = await validateCitation(certificateCitation);
            } else {
                certificate = document;  // the document is a self-signed certificate
            }

            // validate the document using its certificate
            const valid = await notary.validDocument(document, certificate);
            if (!valid) {
                const exception = bali.exception({
                    $module: '/bali/repositories/ValidatedStorage',
                    $procedure: '$validateDocument',
                    $exception: '$documentInvalid',
                    $document: document,
                    $text: 'The signature on the document is invalid.'
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$validateDocument',
                $exception: '$unexpected',
                $document: document,
                $text: 'An unexpected error occurred while attempting to validate a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };


    /**
     * This function validates a notarized message. It makes sure that all notary seals
     * attached to the message are valid. If any seal is not valid an exception is thrown.
     *
     * @param {Catalog} message The notarized message to be validated.
     * @throws {Exception} The message is not valid.
     */
    const validateMessage = async function(message) {
        try {
            // make sure it really is a notarized message
            const content = message.getValue('$content');
            const certificateCitation = message.getValue('$certificate');
            const signature = message.getValue('$signature');
            if (!content || !certificateCitation || !signature) {
                const exception = bali.exception({
                    $module: '/bali/repositories/ValidatedStorage',
                    $procedure: '$validateMessage',
                    $exception: '$messageInvalid',
                    $message: message,
                    $text: 'The message is not notarized.'
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

            // validate the certificate
            var certificate = await validateCitation(certificateCitation);

            // validate the message using its certificate
            const valid = await notary.validDocument(message, certificate);
            if (!valid) {
                const exception = bali.exception({
                    $module: '/bali/repositories/ValidatedStorage',
                    $procedure: '$validateMessage',
                    $exception: '$messageInvalid',
                    $message: message,
                    $text: 'The signature on the message is invalid.'
                });
                if (debug) console.error(exception.toString());
                throw exception;
            }

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$validateMessage',
                $exception: '$unexpected',
                $message: message,
                $text: 'An unexpected error occurred while attempting to validate a message.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    return this;
};
ValidatedStorage.prototype.constructor = ValidatedStorage;
exports.ValidatedStorage = ValidatedStorage;

