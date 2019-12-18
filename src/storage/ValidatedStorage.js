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
const bali = require('bali-component-framework').api();


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
    if (debug > 1) {
        const validator = bali.validator(debug);
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

    this.staticExists = async function(resource) {
        try {
            return await repository.staticExists(resource);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$staticExists',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $resource: resource,
                $text: 'An unexpected error occurred while checking whether or not a static resource exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readStatic = async function(resource) {
        try {
            return await repository.readStatic(resource);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$readStatic',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $resource: resource,
                $text: 'An unexpected error occurred while attempting to read a static resource from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
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
            await validateCitation(citation, debug);
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
            await validateCitation(citation, debug);
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

    this.documentExists = async function(type, tag, version) {
        try {
            return await repository.documentExists(type, tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $type: type,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while checking whether or not a document exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDocument = async function(type, tag, version) {
        try {
            const document = await repository.readDocument(type, tag, version);
            if (document) await validateDocument(document, debug);
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $type: type,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to read a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDocument = async function(type, tag, version, document) {
        try {
            await validateDocument(document, debug);
            await repository.writeDocument(type, tag, version, document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $type: type,
                $tag: tag,
                $version: version,
                $document: document,
                $text: 'An unexpected error occurred while attempting to write a document to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.deleteDocument = async function(type, tag, version) {
        try {
            return await repository.deleteDocument(type, tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$deleteDocument',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $type: type,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to delete a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.addMessage = async function(queue, message) {
        try {
            await validateMessage(message, debug);
            await repository.addMessage(queue, message);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$addMessage',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $queue: queue,
                $message: message,
                $text: 'An unexpected error occurred while attempting to add a message to a queue.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.removeMessage = async function(queue) {
        try {
            const message = await repository.removeMessage(queue);
            if (message) await validateMessage(message, debug);
            return message;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedStorage',
                $procedure: '$removeMessage',
                $exception: '$unexpected',
                $repository: repository.toString(),
                $queue: queue,
                $text: 'An unexpected error occurred while attempting to remove a message from a queue.'
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
     * @param {Boolean} debug An optional flag that determines whether or not exceptions
     * will be logged to the error console.
     * @returns {Catalog} The validated document cited by the citation.
     * @throws {Exception} The digest generated for the document does not match the digest
     * contained within the document citation.
     */
    const validateCitation = async function(citation, debug) {
        try {
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            const document = await repository.readDocument('documents', tag, version);
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
            await validateDocument(document, debug);
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
     * @param {Boolean} debug An optional flag that determines whether or not exceptions
     * will be logged to the error console.
     * @throws {Exception} The document is not valid.
     */
    const validateDocument = async function(document, debug) {
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
                await validateCitation(previousCitation, debug);
            }
    
            // validate the certificate if one exists
            var certificate;
            if (certificateCitation && !certificateCitation.isEqualTo(bali.pattern.NONE)) {
                certificate = await validateCitation(certificateCitation, debug);
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
     * @param {Boolean} debug An optional flag that determines whether or not exceptions
     * will be logged to the error console.
     * @throws {Exception} The message is not valid.
     */
    const validateMessage = async function(message, debug) {
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
            var certificate = await validateCitation(certificateCitation, debug);
    
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

